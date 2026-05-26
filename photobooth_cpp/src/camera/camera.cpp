#include "camera/camera.h"
#include <iostream>
#include <cmath>
#include <vector>

// ------------------------------------------------------------------
// PROCEDURAL GEOMETRIC SWISS-STYLE FACE FILTERS (Flat Vector Art)
// ------------------------------------------------------------------

static void DrawDogFilter(cv::Mat& frame, cv::Rect face) {
    int cx = face.x + face.width / 2;
    int cy = face.y + face.height / 2;
    
    // 1. Dog Ears (Flat organic tilted brown ellipses above the head)
    int earW = face.width * 0.25;
    int earH = face.height * 0.45;
    int earY = face.y - face.height * 0.05;
    
    // Left ear (tilted at -25 degrees)
    cv::RotatedRect leftEar(cv::Point2f(face.x + face.width * 0.05, earY), cv::Size2f(earW, earH), -25.0f);
    cv::ellipse(frame, leftEar, cv::Scalar(42, 65, 102), -1, cv::LINE_AA); // Flat dark brown BGR
    cv::ellipse(frame, leftEar, cv::Scalar(26, 26, 26), 2, cv::LINE_AA); // Outline
    
    // Right ear (tilted at 25 degrees)
    cv::RotatedRect rightEar(cv::Point2f(face.x + face.width * 0.95, earY), cv::Size2f(earW, earH), 25.0f);
    cv::ellipse(frame, rightEar, cv::Scalar(42, 65, 102), -1, cv::LINE_AA);
    cv::ellipse(frame, rightEar, cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    
    // 2. Dog Nose (Sleek black rounded triangle/oval in the center)
    int noseW = face.width * 0.22;
    int noseH = face.height * 0.14;
    int noseY = cy + face.height * 0.06;
    cv::ellipse(frame, cv::Point(cx, noseY + noseH/2), cv::Size(noseW/2, noseH/2), 0, 0, 360, cv::Scalar(26, 26, 26), -1, cv::LINE_AA); // Black nose
    
    // 3. Cute pink tongue hanging down from the nose
    int tongueW = face.width * 0.15;
    int tongueH = face.height * 0.22;
    int tongueY = noseY + noseH + 2;
    cv::ellipse(frame, cv::Point(cx, tongueY + tongueH/2), cv::Size(tongueW/2, tongueH/2), 0, 0, 360, cv::Scalar(122, 115, 240), -1, cv::LINE_AA); // Pink BGR: 240, 115, 122
    cv::ellipse(frame, cv::Point(cx, tongueY + tongueH/2), cv::Size(tongueW/2, tongueH/2), 0, 0, 360, cv::Scalar(26, 26, 26), 2, cv::LINE_AA); // Outline
    cv::line(frame, cv::Point(cx, tongueY), cv::Point(cx, tongueY + tongueH * 0.7), cv::Scalar(26, 26, 26), 2, cv::LINE_AA); // Tongue divider line
}

static void DrawBunnyFilter(cv::Mat& frame, cv::Rect face) {
    int cx = face.x + face.width / 2;
    int cy = face.y + face.height / 2;
    
    // 1. Tall Bunny Ears (White tall ellipses with pink inner ellipses above the head)
    int earW = face.width * 0.16;
    int earH = face.height * 0.8;
    int earY = face.y - face.height * 0.35;
    
    // Left ear (tilted slightly at -10 degrees)
    cv::RotatedRect leftOuter(cv::Point2f(cx - face.width * 0.22, earY), cv::Size2f(earW, earH), -10.0f);
    cv::ellipse(frame, leftOuter, cv::Scalar(248, 249, 250), -1, cv::LINE_AA); // White BGR
    cv::ellipse(frame, leftOuter, cv::Scalar(26, 26, 26), 2, cv::LINE_AA); // Outline
    cv::RotatedRect leftInner(cv::Point2f(cx - face.width * 0.22, earY + 15), cv::Size2f(earW * 0.6, earH * 0.75), -10.0f);
    cv::ellipse(frame, leftInner, cv::Scalar(180, 170, 255), -1, cv::LINE_AA); // Pink BGR
    
    // Right ear (tilted slightly at 10 degrees)
    cv::RotatedRect rightOuter(cv::Point2f(cx + face.width * 0.22, earY), cv::Size2f(earW, earH), 10.0f);
    cv::ellipse(frame, rightOuter, cv::Scalar(248, 249, 250), -1, cv::LINE_AA); // White BGR
    cv::ellipse(frame, rightOuter, cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    cv::RotatedRect rightInner(cv::Point2f(cx + face.width * 0.22, earY + 15), cv::Size2f(earW * 0.6, earH * 0.75), 10.0f);
    cv::ellipse(frame, rightInner, cv::Scalar(180, 170, 255), -1, cv::LINE_AA); // Pink BGR
    
    // 2. Cute pink bunny nose (upside down triangle)
    int noseW = face.width * 0.16;
    int noseY = cy + face.height * 0.08;
    std::vector<cv::Point> triPts = {
        {cx - noseW/2, noseY},
        {cx + noseW/2, noseY},
        {cx, noseY + (int)(noseW * 0.6)}
    };
    cv::fillConvexPoly(frame, triPts, cv::Scalar(180, 170, 255), cv::LINE_AA); // Pink BGR
    cv::polylines(frame, triPts, true, cv::Scalar(26, 26, 26), 2, cv::LINE_AA); // Outline
    
    // 3. Whisker lines
    int whiskerY = noseY + (int)(noseW * 0.3);
    int wLen = face.width * 0.25;
    // Left whiskers
    cv::line(frame, cv::Point(cx - noseW/2 - 5, whiskerY - 5), cv::Point(cx - noseW/2 - wLen, whiskerY - 15), cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    cv::line(frame, cv::Point(cx - noseW/2 - 5, whiskerY), cv::Point(cx - noseW/2 - wLen, whiskerY), cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    cv::line(frame, cv::Point(cx - noseW/2 - 5, whiskerY + 5), cv::Point(cx - noseW/2 - wLen, whiskerY + 15), cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    
    // Right whiskers
    cv::line(frame, cv::Point(cx + noseW/2 + 5, whiskerY - 5), cv::Point(cx + noseW/2 + wLen, whiskerY - 15), cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    cv::line(frame, cv::Point(cx + noseW/2 + 5, whiskerY), cv::Point(cx + noseW/2 + wLen, whiskerY), cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    cv::line(frame, cv::Point(cx + noseW/2 + 5, whiskerY + 5), cv::Point(cx + noseW/2 + wLen, whiskerY + 15), cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
}

static void DrawGlassesFilter(cv::Mat& frame, cv::Rect face) {
    int cx = face.x + face.width / 2;
    int eyeY = face.y + face.height * 0.38;
    
    // Cool retro Bauhaus sunglasses (Two thick circles connected by a bar, e.g. Neon Swiss Red)
    int lensR = face.width * 0.17;
    int offset = face.width * 0.19;
    
    int leftL = cx - offset;
    int rightL = cx + offset;
    
    // Left Lens
    cv::circle(frame, cv::Point(leftL, eyeY), lensR, cv::Scalar(26, 26, 26), -1, cv::LINE_AA); // Dark body
    cv::circle(frame, cv::Point(leftL, eyeY), lensR, cv::Scalar(70, 57, 230), 4, cv::LINE_AA);  // Neon Red Frame BGR
    
    // Right Lens
    cv::circle(frame, cv::Point(rightL, eyeY), lensR, cv::Scalar(26, 26, 26), -1, cv::LINE_AA);
    cv::circle(frame, cv::Point(rightL, eyeY), lensR, cv::Scalar(70, 57, 230), 4, cv::LINE_AA);
    
    // Connection bridge
    cv::line(frame, cv::Point(leftL + lensR - 3, eyeY), cv::Point(rightL - lensR + 3, eyeY), cv::Scalar(70, 57, 230), 6, cv::LINE_AA);
    cv::line(frame, cv::Point(leftL + lensR - 3, eyeY), cv::Point(rightL - lensR + 3, eyeY), cv::Scalar(26, 26, 26), 2, cv::LINE_AA);
    
    // Diagonal glass reflection shine lines
    int refLen = lensR * 0.6;
    cv::line(frame, cv::Point(leftL - refLen/2, eyeY - refLen/2), cv::Point(leftL + refLen/2, eyeY + refLen/2), cv::Scalar(180, 180, 180), 2, cv::LINE_AA);
    cv::line(frame, cv::Point(rightL - refLen/2, eyeY - refLen/2), cv::Point(rightL + refLen/2, eyeY + refLen/2), cv::Scalar(180, 180, 180), 2, cv::LINE_AA);
}

// ------------------------------------------------------------------
// CAMERAMANAGER IMPLEMENTATION
// ------------------------------------------------------------------

CameraManager::CameraManager() : isRunning(false), capOpened(false), activeFilter(0), hasFaceCascade(false) {}

CameraManager::~CameraManager() {
    Shutdown();
}

bool CameraManager::Initialize(int deviceId) {
    Shutdown();
    
    std::cout << "[Camera] Initializing camera device ID: " << deviceId << "..." << std::endl;
    
    // Load face detector Haar cascade XML file
    hasFaceCascade = faceCascade.load("assets/haarcascade_frontalface_default.xml");
    if (!hasFaceCascade) {
        std::cerr << "[Camera] ERROR: Failed to load assets/haarcascade_frontalface_default.xml! AR Filters disabled." << std::endl;
    } else {
        std::cout << "[Camera] Face detection Haar cascade loaded successfully." << std::endl;
    }
    
    // Attempt to open camera using default macOS AVFoundation pipeline
    capOpened = cap.open(deviceId, cv::CAP_ANY);
    if (!capOpened) {
        std::cerr << "[Camera] WARNING: Failed to open hardware camera. Launching clean visual Swiss Simulator!" << std::endl;
    } else {
        // Set resolution for standard fast streaming
        cap.set(cv::CAP_PROP_FRAME_WIDTH, 640);
        cap.set(cv::CAP_PROP_FRAME_HEIGHT, 480);
        std::cout << "[Camera] Hardware camera successfully connected." << std::endl;
    }
    
    isRunning = true;
    captureThread = std::thread(&CameraManager::CaptureLoop, this);
    return true;
}

void CameraManager::Shutdown() {
    if (isRunning) {
        isRunning = false;
        if (captureThread.joinable()) {
            captureThread.join();
        }
    }
    if (cap.isOpened()) {
        cap.release();
    }
    capOpened = false;
}

cv::Mat CameraManager::GetLatestMat() {
    std::lock_guard<std::mutex> lock(frameMutex);
    if (latestFrame.empty()) {
        return cv::Mat::zeros(480, 640, CV_8UC3);
    }
    return latestFrame.clone();
}

bool CameraManager::UpdateRaylibTexture(Texture2D& texture) {
    cv::Mat localRgb;
    {
        std::lock_guard<std::mutex> lock(frameMutex);
        if (latestFrame.empty()) return false;
        cv::cvtColor(latestFrame, localRgb, cv::COLOR_BGR2RGB);
    }
    
    // Update or generate Raylib GPU texture
    if (texture.id == 0 || texture.width != localRgb.cols || texture.height != localRgb.rows) {
        if (texture.id != 0) {
            UnloadTexture(texture);
        }
        Image img = {
            localRgb.data,
            localRgb.cols,
            localRgb.rows,
            1,
            PIXELFORMAT_UNCOMPRESSED_R8G8B8
        };
        texture = LoadTextureFromImage(img);
    } else {
        UpdateTexture(texture, localRgb.data);
    }
    return true;
}

void CameraManager::CaptureLoop() {
    int frameCount = 0;
    while (isRunning) {
        cv::Mat frame;
        
        if (capOpened) {
            cap.read(frame);
            if (frame.empty()) {
                capOpened = false;
            } else {
                // Apply Active Snapchat Face Filter in real-time
                int filter = activeFilter;
                if (hasFaceCascade && filter > 0) {
                    // Downscale to 320x240 and convert to grayscale for super fast lag-free tracking!
                    cv::Mat gray, smallImg;
                    cv::cvtColor(frame, gray, cv::COLOR_BGR2GRAY);
                    double scale = (double)frame.cols / 320.0;
                    cv::resize(gray, smallImg, cv::Size(320, 240));
                    cv::equalizeHist(smallImg, smallImg);
                    
                    std::vector<cv::Rect> faces;
                    faceCascade.detectMultiScale(smallImg, faces, 1.15, 3, 0 | cv::CASCADE_SCALE_IMAGE, cv::Size(40, 40));
                    
                    for (const auto& f : faces) {
                        // Scale detected rectangle back to full frame size
                        cv::Rect faceRect(f.x * scale, f.y * scale, f.width * scale, f.height * scale);
                        
                        if (filter == 1) {
                            DrawDogFilter(frame, faceRect);
                        } else if (filter == 2) {
                            DrawBunnyFilter(frame, faceRect);
                        } else if (filter == 3) {
                            DrawGlassesFilter(frame, faceRect);
                        }
                    }
                }
            }
        }
        
        // Mock Camera Fallback (Rotating Swiss Cross Motion Graphic)
        if (!capOpened) {
            frame = cv::Mat::zeros(480, 640, CV_8UC3);
            frame.setTo(cv::Scalar(240, 240, 240)); // BGR: Light Gray Snow (#F0F0F0)
            
            int cx = 320;
            int cy = 240;
            int circleRadius = 90;
            int crossLen = 50;
            int crossThick = 18;
            
            // Draw pure Swiss Red accent circle in BGR
            cv::circle(frame, cv::Point(cx, cy), circleRadius, cv::Scalar(70, 57, 230), -1, cv::LINE_AA);
            
            // Compute rotation
            double angle = (frameCount * 1.5) * (3.14159265 / 180.0);
            double cosA = std::cos(angle);
            double sinA = std::sin(angle);
            
            auto rotateAndDrawRect = [&](int w, int h, cv::Scalar color) {
                std::vector<cv::Point> pts(4);
                cv::Point corners[4] = {
                    {-w/2, -h/2}, {w/2, -h/2}, {w/2, h/2}, {-w/2, h/2}
                };
                for (int i = 0; i < 4; i++) {
                    int rx = corners[i].x * cosA - corners[i].y * sinA + cx;
                    int ry = corners[i].x * sinA + corners[i].y * cosA + cy;
                    pts[i] = cv::Point(rx, ry);
                }
                cv::fillConvexPoly(frame, pts, color, cv::LINE_AA);
            };
            
            // Draw horizontal and vertical bars of Swiss Cross in pure white
            rotateAndDrawRect(crossLen, crossThick, cv::Scalar(255, 255, 255));
            rotateAndDrawRect(crossThick, crossLen, cv::Scalar(255, 255, 255));
            
            // Stark Swiss Grid text overlay
            cv::putText(frame, "STRIPS BOOTH // CAMERA SIMULATOR", cv::Point(40, 430), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.45, cv::Scalar(26, 26, 26), 1, cv::LINE_AA);
            cv::putText(frame, "LDR-PHOTOBOOTH CORE", cv::Point(40, 450), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.35, cv::Scalar(141, 153, 174), 1, cv::LINE_AA);
            
            // Apply mock face filter tracking onto moving cross
            int filter = activeFilter;
            if (filter > 0) {
                cv::Rect mockFace(cx - 70, cy - 80, 140, 160);
                if (filter == 1) {
                    DrawDogFilter(frame, mockFace);
                } else if (filter == 2) {
                    DrawBunnyFilter(frame, mockFace);
                } else if (filter == 3) {
                    DrawGlassesFilter(frame, mockFace);
                }
            }
            
            frameCount++;
        }
        
        {
            std::lock_guard<std::mutex> lock(frameMutex);
            latestFrame = frame.clone();
        }
        
        // Delay to yield CPU (~30 FPS)
        std::this_thread::sleep_for(std::chrono::milliseconds(33));
    }
}
