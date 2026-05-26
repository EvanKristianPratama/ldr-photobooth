// C++ BLE printer CLI tester using printer.h
#include "src/printer.h"
#include <iostream>

int main() {
    std::string port = "/dev/cu.RPP02N";
    std::cout << "=== C++ DIRECT PRINTER TEST ===" << std::endl;
    std::cout << "Target Port: " << port << std::endl;
    
    // Check if test image assets/Ldr_photobooth.png exists
    struct stat info;
    if (stat("assets/Ldr_photobooth.png", &info) != 0) {
        std::cout << "[ERROR] assets/Ldr_photobooth.png not found! Checking alternative..." << std::endl;
    }
    
    std::cout << "Starting PrintTestPage()..." << std::endl;
    bool success = PrinterManager::PrintTestPage(port);
    
    if (success) {
        std::cout << "\n==========================================" << std::endl;
        std::cout << "✓ SUCCESS: Print payload successfully sent!" << std::endl;
        std::cout << "Check if your printer is printing the image logo." << std::endl;
        std::cout << "==========================================" << std::endl;
    } else {
        std::cout << "\n❌ ERROR: Printing failed!" << std::endl;
    }
    
    return success ? 0 : 1;
}
