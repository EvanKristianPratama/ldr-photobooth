#ifndef PRINTER_H
#define PRINTER_H

#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <iostream>
#include <cstdio>
#include <memory>
#include <array>
#include <sys/stat.h>
#include <dirent.h>
#include <fcntl.h>
#include <termios.h>
#include <unistd.h>
#include <thread>
#include <atomic>
#include <mutex>
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/imgcodecs.hpp>

class PrinterManager {
public:
    inline static std::atomic<bool> isBusy{false};
    inline static std::string statusMessage = "Awaiting hardware actions...";
    inline static std::mutex statusMutex;
    
    // Frame-based printing queue properties
    inline static std::vector<unsigned char> printQueue;
    inline static size_t queueOffset{0};
    inline static int activeFd{-1};
    inline static std::string activePort = "";

    static void SetStatus(const std::string& msg) {
        std::lock_guard<std::mutex> lock(statusMutex);
        statusMessage = msg;
    }

    static std::string GetStatus() {
        std::lock_guard<std::mutex> lock(statusMutex);
        return statusMessage;
    }

    static void StartPrint(const std::string& printerName, const std::vector<unsigned char>& data) {
        if (activeFd >= 0) return; // Busy
        
        activePort = ToCuPort(printerName);
        printQueue = data;
        queueOffset = 0;
        
        std::cout << "[Printer] Opening port in main loop: " << activePort << std::endl;
        activeFd = open(activePort.c_str(), O_WRONLY | O_NOCTTY | O_NONBLOCK);
        if (activeFd < 0) {
            std::cerr << "[Printer] ERROR: Failed to open device fd: " << activePort << " (errno: " << errno << ")" << std::endl;
            SetStatus("ERROR: FAILED TO OPEN PORT!");
            return;
        }
        
        // Configure termios for raw 9600 baud communication
        struct termios tty;
        memset(&tty, 0, sizeof(tty));
        if (tcgetattr(activeFd, &tty) != 0) {
            std::cerr << "[Printer] WARNING: tcgetattr failed" << std::endl;
        }
        cfsetospeed(&tty, B9600);
        cfsetispeed(&tty, B9600);
        tty.c_cflag &= ~PARENB;
        tty.c_cflag &= ~CSTOPB;
        tty.c_cflag &= ~CSIZE;
        tty.c_cflag |= CS8;
        tty.c_cflag &= ~CRTSCTS;
        tty.c_cflag |= (CLOCAL | CREAD);
        tty.c_lflag &= ~(ICANON | ECHO | ECHOE | ISIG);
        tty.c_iflag &= ~(IXON | IXOFF | IXANY | IGNBRK | BRKINT | PARMRK | ISTRIP | INLCR | IGNCR | ICRNL);
        tty.c_oflag &= ~OPOST;
        tty.c_oflag &= ~ONLCR;
        tcsetattr(activeFd, TCSANOW, &tty);
        tcflush(activeFd, TCIOFLUSH);
        
        isBusy = true;
        SetStatus("PRINTING... 0%");
        std::cout << "[Printer] Starting frame-based streaming of " << printQueue.size() << " bytes..." << std::endl;
    }

    static void Update() {
        if (activeFd < 0) return; // No print job in progress
        
        // Write 128 bytes per frame (takes approx 0.3ms, keeps 60 FPS perfectly smooth)
        size_t chunkSize = 128;
        size_t remaining = printQueue.size() - queueOffset;
        size_t toWrite = (remaining < chunkSize) ? remaining : chunkSize;
        
        ssize_t written = write(activeFd, printQueue.data() + queueOffset, toWrite);
        if (written < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) {
                // macOS Bluetooth buffer is full, retry on next frame
                return;
            }
            std::cerr << "[Printer] ERROR: Write failed in main loop at byte " << queueOffset << " (errno: " << errno << ")" << std::endl;
            close(activeFd);
            activeFd = -1;
            isBusy = false;
            SetStatus("ERROR: PRINT JOB FAILED!");
            return;
        }
        
        queueOffset += written;
        
        // Update telemetry status message with percentage progress
        int pct = (int)((queueOffset * 100) / printQueue.size());
        SetStatus("PRINTING... " + std::to_string(pct) + "%");
        
        if (queueOffset >= printQueue.size()) {
            // Done streaming! Wait 50ms and close.
            usleep(50000);
            close(activeFd);
            activeFd = -1;
            isBusy = false;
            SetStatus("SUCCESS: PRINT COMPLETED!");
            std::cout << "[Printer] Frame-based streaming completed successfully!" << std::endl;
        }
    }

    static void PrintImageAsync(const std::string& printerName, const std::string& filePath) {
        if (isBusy) return;
        
        std::cout << "[Printer] Pre-compiling " << filePath << " for frame printing..." << std::endl;
        std::vector<unsigned char> escPosBytes;
        if (!ConvertPngToEscPos(filePath, escPosBytes)) {
            std::cerr << "[Printer] ERROR: ESC/POS compilation failed!" << std::endl;
            SetStatus("ERROR: COMPILATION FAILED!");
            return;
        }
        
        StartPrint(printerName, escPosBytes);
    }

    static void PrintTestPageAsync(const std::string& printerName) {
        if (isBusy) return;
        
        std::string testPath = "assets/Ldr_photobooth.png";
        struct stat info;
        if (stat(testPath.c_str(), &info) != 0) {
            testPath = "";
            DIR* dir = opendir("exports");
            if (dir) {
                struct dirent* entry;
                while ((entry = readdir(dir)) != nullptr) {
                    std::string fn = entry->d_name;
                    if (fn.length() > 4 && fn.substr(fn.length() - 4) == ".png") {
                        testPath = "exports/" + fn;
                        break;
                    }
                }
                closedir(dir);
            }
        }
        
        if (testPath.empty()) {
            std::cerr << "[Printer] ERROR: No test image found for async print!" << std::endl;
            SetStatus("ERROR: NO TEST IMAGE!");
            return;
        }
        
        PrintImageAsync(printerName, testPath);
    }

    // Convert tty.* path to cu.* path (macOS callout port that doesn't block on DCD)
    static std::string ToCuPort(const std::string& devicePath) {
        std::string result = devicePath;
        size_t pos = result.find("/dev/tty.");
        if (pos != std::string::npos) {
            result.replace(pos, 9, "/dev/cu.");
        }
        return result;
    }
    
    // Scan /dev for cu.* callout serial port files (Bluetooth SPP devices)
    // We use cu.* instead of tty.* because tty.* blocks waiting for DCD carrier detect
    static std::vector<std::string> GetAvailablePrinters() {
        std::vector<std::string> devices;
        DIR* dir = opendir("/dev");
        if (dir) {
            struct dirent* entry;
            while ((entry = readdir(dir)) != nullptr) {
                std::string name = entry->d_name;
                // Look for "cu." prefix (callout ports - don't block on open)
                if (name.rfind("cu.", 0) == 0) {
                    // Ignore standard system serial devices
                    if (name != "cu.Bluetooth-Incoming-Port" &&
                        name != "cu.debug-console" &&
                        name != "cu.wlan-debug") {
                        devices.push_back("/dev/" + name);
                    }
                }
            }
            closedir(dir);
        }
        std::cout << "[Printer] Scanned " << devices.size() << " available cu.* callout serial devices." << std::endl;
        return devices;
    }
    
    // Load printer settings from disk config
    static void LoadPrinterSettings(std::string& printerName, bool& autoPrint) {
        printerName = "";
        autoPrint = false;
        
        std::ifstream file("exports/printer_settings.cfg");
        if (!file.is_open()) {
            std::cout << "[Printer] Config not found, using default empty printer settings." << std::endl;
            return;
        }
        
        std::string line;
        while (std::getline(file, line)) {
            if (line.empty() || line[0] == '#') continue;
            
            std::stringstream ss(line);
            std::string key, value;
            if (std::getline(ss, key, '=') && std::getline(ss, value)) {
                // Trim potential spaces
                while (!key.empty() && key.back() == ' ') key.pop_back();
                while (!key.empty() && key.front() == ' ') key.erase(key.begin());
                while (!value.empty() && value.back() == ' ') value.pop_back();
                while (!value.empty() && value.front() == ' ') value.erase(value.begin());
                
                if (key == "printer_name") {
                    printerName = value;
                } else if (key == "auto_print") {
                    autoPrint = (value == "1" || value == "true");
                }
            }
        }
        std::cout << "[Printer] Loaded settings -> Device: '" << printerName << "', Auto-Print: " << (autoPrint ? "YES" : "NO") << std::endl;
    }
    
    // Save printer settings to disk config
    static void SavePrinterSettings(const std::string& printerName, bool autoPrint) {
        struct stat info;
        if (stat("exports", &info) != 0) {
            mkdir("exports", 0777);
        }
        
        std::ofstream file("exports/printer_settings.cfg");
        if (!file.is_open()) {
            std::cerr << "[Printer] ERROR: Failed to save printer settings to disk!" << std::endl;
            return;
        }
        
        file << "# STRIPS PHOTOBOOTH SYSTEM PRINTER CONFIGURATION\n";
        file << "printer_name=" << printerName << "\n";
        file << "auto_print=" << (autoPrint ? "1" : "0") << "\n";
        
        std::cout << "[Printer] Settings successfully saved to exports/printer_settings.cfg" << std::endl;
    }
    
    // Convert a PNG image to ESC/POS raster bit image format (GS v 0 command)
    static bool ConvertPngToEscPos(const std::string& pngPath, std::vector<unsigned char>& outData) {
        cv::Mat img = cv::imread(pngPath, cv::IMREAD_GRAYSCALE);
        if (img.empty()) {
            std::cerr << "[Printer] ERROR: Failed to read image for ESC/POS: " << pngPath << std::endl;
            return false;
        }

        // Resize width to standard 576 pixels (exactly 72 bytes wide) for 80mm thermal receipt printers
        int targetWidth = 576;
        int targetHeight = (img.rows * targetWidth) / img.cols;
        cv::Mat resized;
        cv::resize(img, resized, cv::Size(targetWidth, targetHeight));

        // Initialize printer: ESC @ (0x1B 0x40)
        outData.push_back(0x1B);
        outData.push_back(0x40);

        // Set line spacing to 0: ESC 3 0 (0x1B 0x33 0x00)
        outData.push_back(0x1B);
        outData.push_back(0x33);
        outData.push_back(0x00);

        // Command code: GS v 0 (0x1D 0x76 0x30 0x00)
        int bytesWidth = targetWidth / 8; // 72 bytes
        outData.push_back(0x1D);
        outData.push_back(0x76);
        outData.push_back(0x30);
        outData.push_back(0x00); // Normal mode (1x zoom)
        
        // Width in bytes (xL, xH)
        outData.push_back(bytesWidth & 0xFF);
        outData.push_back((bytesWidth >> 8) & 0xFF);
        
        // Height in pixels (yL, yH)
        outData.push_back(targetHeight & 0xFF);
        outData.push_back((targetHeight >> 8) & 0xFF);

        // Standard thresholding to convert 8-bit grayscale to 1-bit binary raster
        for (int y = 0; y < targetHeight; ++y) {
            for (int xByte = 0; xByte < bytesWidth; ++xByte) {
                unsigned char byteVal = 0;
                for (int bit = 0; bit < 8; ++bit) {
                    int px = xByte * 8 + bit;
                    unsigned char grayVal = resized.at<unsigned char>(y, px);
                    // Standard thermal printing: values < 127 are black (1), >= 127 are white (0)
                    if (grayVal < 127) {
                        byteVal |= (1 << (7 - bit));
                    }
                }
                outData.push_back(byteVal);
            }
        }

        // Feed paper at the end (LF x 6 lines) so it passes the tear-off blade
        for (int i = 0; i < 6; ++i) {
            outData.push_back(0x0A);
        }
        
        // Auto-cutter Command: GS V 66 0 (0x1D 0x56 0x42 0x00)
        outData.push_back(0x1D);
        outData.push_back(0x56);
        outData.push_back(0x42);
        outData.push_back(0x00);

        std::cout << "[Printer] Generated ESC/POS stream: " << outData.size() << " bytes (Width: 576px, Height: " << targetHeight << "px)." << std::endl;
        return true;
    }
    
    // Print a compiled image directly to a selected virtual serial/Bluetooth device file
    // Uses POSIX termios for proper serial port configuration (raw mode, correct baud rate)
    static bool PrintImage(const std::string& printerName, const std::string& filePath) {
        if (printerName.empty()) {
            std::cerr << "[Printer] ERROR: Cannot print, no device port selected!" << std::endl;
            return false;
        }
        if (filePath.empty()) {
            std::cerr << "[Printer] ERROR: Cannot print, empty file path!" << std::endl;
            return false;
        }
        
        std::cout << "[Printer] Converting " << filePath << " to ESC/POS raw bytes..." << std::endl;
        std::vector<unsigned char> escPosBytes;
        if (!ConvertPngToEscPos(filePath, escPosBytes)) {
            std::cerr << "[Printer] ERROR: ESC/POS compilation failed!" << std::endl;
            return false;
        }
        
        // Auto-convert tty.* to cu.* (cu = callout port, doesn't block on DCD carrier detect)
        std::string cuPort = ToCuPort(printerName);
        
        // Open serial port with POSIX: O_WRONLY (write-only), O_NOCTTY (don't become controlling terminal),
        // O_NONBLOCK (don't block on open)
        std::cout << "[Printer] Opening serial port (POSIX cu): " << cuPort << std::endl;
        int fd = open(cuPort.c_str(), O_WRONLY | O_NOCTTY | O_NONBLOCK);
        if (fd < 0) {
            std::cerr << "[Printer] ERROR: Failed to open device fd: " << cuPort << " (errno: " << errno << ")" << std::endl;
            return false;
        }
        
        // Keep O_NONBLOCK active for robust macOS Bluetooth communication to avoid deep driver blocks
        
        // Configure termios for raw serial communication
        struct termios tty;
        memset(&tty, 0, sizeof(tty));
        
        if (tcgetattr(fd, &tty) != 0) {
            std::cerr << "[Printer] WARNING: tcgetattr failed, proceeding with defaults." << std::endl;
        }
        
        // Set baud rate: 9600 (verified for RPP02N Bluetooth thermal printer)
        cfsetospeed(&tty, B9600);
        cfsetispeed(&tty, B9600);
        
        // 8N1 configuration (8 data bits, no parity, 1 stop bit)
        tty.c_cflag &= ~PARENB;        // No parity
        tty.c_cflag &= ~CSTOPB;        // 1 stop bit
        tty.c_cflag &= ~CSIZE;
        tty.c_cflag |= CS8;            // 8 data bits
        
        // No hardware flow control
        tty.c_cflag &= ~CRTSCTS;
        
        // Enable receiver, local mode
        tty.c_cflag |= (CLOCAL | CREAD);
        
        // Raw mode: disable canonical processing, echo, signals
        tty.c_lflag &= ~(ICANON | ECHO | ECHOE | ISIG);
        
        // Raw input: disable software flow control and special character handling
        tty.c_iflag &= ~(IXON | IXOFF | IXANY);
        tty.c_iflag &= ~(IGNBRK | BRKINT | PARMRK | ISTRIP | INLCR | IGNCR | ICRNL);
        
        // Raw output: no output processing
        tty.c_oflag &= ~OPOST;
        tty.c_oflag &= ~ONLCR;
        
        // Non-blocking read settings (not critical for write-only, but good practice)
        tty.c_cc[VMIN] = 0;
        tty.c_cc[VTIME] = 10; // 1 second timeout
        
        // Apply the termios settings
        if (tcsetattr(fd, TCSANOW, &tty) != 0) {
            std::cerr << "[Printer] WARNING: tcgetattr failed, proceeding anyway." << std::endl;
        }
        
        // Flush any pending data on the port
        tcflush(fd, TCIOFLUSH);
        
        // Write ESC/POS data in small chunks to avoid Bluetooth buffer overflow
        std::cout << "[Printer] Streaming " << escPosBytes.size() << " bytes to device..." << std::endl;
        size_t totalWritten = 0;
        size_t chunkSize = 64; // Small chunks for Bluetooth SPP reliability at 9600 baud
        
        while (totalWritten < escPosBytes.size()) {
            size_t remaining = escPosBytes.size() - totalWritten;
            size_t toWrite = (remaining < chunkSize) ? remaining : chunkSize;
            
            ssize_t written = write(fd, escPosBytes.data() + totalWritten, toWrite);
            if (written < 0) {
                if (errno == EAGAIN || errno == EWOULDBLOCK) {
                    // Buffer is full, wait a bit and retry
                    usleep(30000);
                    continue;
                }
                std::cerr << "[Printer] ERROR: Write failed at byte " << totalWritten << " (errno: " << errno << ")" << std::endl;
                close(fd);
                return false;
            }
            totalWritten += written;
            
            // Small delay between chunks to let Bluetooth SPP buffer drain
            usleep(15000); // 15ms per chunk for rock-solid 9600 baud transmission
        }
        
        // Wait briefly for the last chunk to send, then close (don't use tcdrain on macOS virtual Bluetooth serial ports as it blocks indefinitely)
        usleep(200000);
        close(fd);
        
        std::cout << "[Printer] Print payload successfully sent (" << totalWritten << " bytes) to: " << cuPort << std::endl;
        return true;
    }
    
    // Send a test page (using brand logo) to verify direct connection
    static bool PrintTestPage(const std::string& printerName) {
        std::string testPath = "assets/Ldr_photobooth.png";
        struct stat info;
        if (stat(testPath.c_str(), &info) != 0) {
            testPath = "";
            DIR* dir = opendir("exports");
            if (dir) {
                struct dirent* entry;
                while ((entry = readdir(dir)) != nullptr) {
                    std::string fn = entry->d_name;
                    if (fn.length() > 4 && fn.substr(fn.length() - 4) == ".png") {
                        testPath = "exports/" + fn;
                        break;
                    }
                }
                closedir(dir);
            }
        }
        
        if (testPath.empty()) {
            std::cerr << "[Printer] ERROR: No test image found to print!" << std::endl;
            return false;
        }
        
        return PrintImage(printerName, testPath);
    }
};

#endif // PRINTER_H
