// Non-blocking Bluetooth thermal printer test program
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <termios.h>
#include <unistd.h>
#include <errno.h>

static int try_print(const char* port, speed_t baud, const char* baudName) {
    printf("[TEST] Trying to connect at %s baud on %s...\n", baudName, port);
    
    // Open in write-only, non-blocking mode
    int fd = open(port, O_WRONLY | O_NOCTTY | O_NONBLOCK);
    if (fd < 0) {
        printf("[TEST] ERROR: open() failed (errno %d - %s)\n", errno, strerror(errno));
        return -1;
    }
    
    // Set non-blocking write timeout using select
    struct termios tty;
    memset(&tty, 0, sizeof(tty));
    if (tcgetattr(fd, &tty) != 0) {
        printf("[TEST] WARNING: tcgetattr failed\n");
    }
    
    cfsetospeed(&tty, baud);
    cfsetispeed(&tty, baud);
    
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
    
    tcsetattr(fd, TCSANOW, &tty);
    
    // ESC/POS init + hello message + feed + cut
    unsigned char payload[256];
    int len = 0;
    
    payload[len++] = 0x1B; // ESC
    payload[len++] = 0x40; // @ (Init)
    
    char msg[128];
    snprintf(msg, sizeof(msg), "\n================================\n  HELLO PRINTER AT %s BAUD!\n================================\n\n\n\n", baudName);
    memcpy(payload + len, msg, strlen(msg));
    len += strlen(msg);
    
    // Feed and cut
    payload[len++] = 0x1D;
    payload[len++] = 0x56;
    payload[len++] = 0x42;
    payload[len++] = 0x00;
    
    // Send in chunks of 32 bytes with small delay
    int written = 0;
    printf("[TEST] Writing payload...");
    while (written < len) {
        int chunk = (len - written > 32) ? 32 : (len - written);
        ssize_t w = write(fd, payload + written, chunk);
        if (w < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) {
                // Wait a bit for buffer to clear
                usleep(50000);
                continue;
            }
            printf("\n[TEST] ERROR: write failed at byte %d (errno %d - %s)\n", written, errno, strerror(errno));
            close(fd);
            return -1;
        }
        written += w;
        usleep(15000); // 15ms between chunks
    }
    printf(" SUCCESS!\n");
    
    // Wait for data to drain with a 1-second timeout
    tcdrain(fd);
    close(fd);
    
    printf("[TEST] Finished attempt at %s baud.\n\n", baudName);
    return 0;
}

int main() {
    const char* port = "/dev/cu.RPP02N";
    
    printf("=== BLUETOOTH THERMAL PRINTER TEST ===\n");
    printf("Port: %s\n", port);
    printf("IMPORTANT: Please TURN OFF Bluetooth on your iPhone before starting this test!\n\n");
    
    // We try B9600 first (extremely common fallback) and B115200 second (standard modern)
    try_print(port, B9600, "9600");
    sleep(2);
    try_print(port, B115200, "115200");
    
    printf("=== TEST PROCESS COMPLETED ===\n");
    return 0;
}
