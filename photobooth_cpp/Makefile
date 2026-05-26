CXX = clang++
CXXFLAGS = -std=c++17 -Wall -Wextra -O3 -I/opt/homebrew/include -I/opt/homebrew/include/opencv4 -I./src
LDFLAGS = -L/opt/homebrew/lib -lraylib -lopencv_core -lopencv_videoio -lopencv_imgproc -lopencv_imgcodecs -lopencv_objdetect \
          -framework Cocoa -framework IOKit -framework CoreVideo

SRC_DIR = src
OBJ_DIR = obj

SRCS = $(SRC_DIR)/main.cpp \
       $(SRC_DIR)/camera/camera.cpp \
       $(SRC_DIR)/ui/ui.cpp \
       $(SRC_DIR)/ui/ui_widgets.cpp \
       $(SRC_DIR)/ui/ui_screens.cpp \
       $(SRC_DIR)/ui/ui_settings.cpp \
       $(SRC_DIR)/ui/ui_canvas.cpp \
       $(SRC_DIR)/ui/ui_persistence.cpp \
       $(SRC_DIR)/image/processor.cpp

OBJS = $(SRCS:$(SRC_DIR)/%.cpp=$(OBJ_DIR)/%.o)
TARGET = swiss_booth

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(OBJS) -o $(TARGET) $(LDFLAGS)

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.cpp
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -rf $(OBJ_DIR) $(TARGET)

.PHONY: all clean
