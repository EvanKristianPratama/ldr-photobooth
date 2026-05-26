#ifndef CAMERA_H
#define CAMERA_H

#include <opencv2/videoio.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/objdetect.hpp>
#include <thread>
#include <mutex>
#include <atomic>
#include "common.h"

class CameraManager {
private:
    cv::VideoCapture cap;
    std::thread captureThread;
    std::mutex frameMutex;
    cv::Mat latestFrame;
    std::atomic<bool> isRunning;
    bool capOpened;

    cv::CascadeClassifier faceCascade;
    std::atomic<int> activeFilter; // 0 = None, 1 = Dog, 2 = Bunny, 3 = Glasses
    bool hasFaceCascade;

    void CaptureLoop();

public:
    CameraManager();
    ~CameraManager();

    bool Initialize(int deviceId = 0);
    void Shutdown();

    // Retrieves the latest raw OpenCV Mat for high-quality file composition
    cv::Mat GetLatestMat();

    // Thread-safely copies the latest frame into a Raylib GPU texture
    bool UpdateRaylibTexture(Texture2D& texture);
    
    void SetActiveFilter(int filterId) { activeFilter = filterId; }
    int GetActiveFilter() const { return activeFilter; }
    
    bool IsOpened() const { return capOpened; }
};

#endif // CAMERA_H
