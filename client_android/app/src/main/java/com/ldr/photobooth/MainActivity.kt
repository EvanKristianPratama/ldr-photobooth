package com.ldr.photobooth

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.print.PrintHelper
import com.ldr.photobooth.utils.ReceiptRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

// --- Screen States ---
enum class ScreenState {
    START,
    CHOOSE_LAYOUT,
    CAPTURE,
    RETAKE_REVIEW,
    RESULT
}

class MainActivity : ComponentActivity() {

    private lateinit var cameraExecutor: ExecutorService
    private var imageCapture: ImageCapture? = null

    // System Settings fetched from Next.js CMS
    private var androidPhotoChoices = mutableStateListOf(1, 3, 4)
    private var receiptTitle = mutableStateOf("LDR THERMAL BOOTH")
    private var receiptSubtitle = mutableStateOf("STORE #9821 // ZURICH CO-OP STUDIO")
    private var receiptSlogan = mutableStateOf("THANK YOU FOR YOUR VISIT!")

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: false
        if (!cameraGranted) {
            Toast.makeText(this, "Camera permission is required to capture photos!", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cameraExecutor = Executors.newSingleThreadExecutor()

        // Request Permissions
        val permissions = mutableListOf(Manifest.permission.CAMERA)
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
            permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
        requestPermissionLauncher.launch(permissions.toTypedArray())

        // Fetch CMS configurations asynchronously
        fetchCmsSettings()

        setContent {
            LdrPhotoboothTheme {
                MainAppContainer()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    private fun fetchCmsSettings() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL("https://ldr-photobooth.if2372047.workers.dev/api/cms/settings")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                
                if (conn.responseCode == 200) {
                    val input: InputStream = conn.inputStream
                    val responseStr = input.bufferedReader().use { it.readText() }
                    val json = JSONObject(responseStr)
                    
                    withContext(Dispatchers.Main) {
                        if (json.has("android_photo_choices")) {
                            val choices = json.getString("android_photo_choices")
                                .split(",")
                                .mapNotNull { it.trim().toIntOrNull() }
                            if (choices.isNotEmpty()) {
                                androidPhotoChoices.clear()
                                androidPhotoChoices.addAll(choices)
                            }
                        }
                        if (json.has("receipt_title")) receiptTitle.value = json.getString("receipt_title")
                        if (json.has("receipt_subtitle")) receiptSubtitle.value = json.getString("receipt_subtitle")
                        if (json.has("receipt_slogan")) receiptSlogan.value = json.getString("receipt_slogan")
                    }
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Failed to fetch settings from CMS worker: ${e.message}")
            }
        }
    }

    @OptIn(ExperimentalAnimationApi::class)
    @Composable
    fun MainAppContainer() {
        var currentState by remember { mutableStateOf(ScreenState::START) }
        var selectedPhotoCount by remember { mutableIntStateOf(4) }
        
        // Capture Session Cache
        val capturedBitmaps = remember { mutableStateListOf<Bitmap>() }
        var currentCaptureIndex by remember { mutableIntStateOf(0) }
        
        // Photo under review
        var reviewBitmap by remember { mutableStateOf<Bitmap?>(null) }
        
        // Compiled Result Ticket
        var resultBitmap by remember { mutableStateOf<Bitmap?>(null) }

        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            AnimatedContent(
                targetState = currentState,
                transitionSpec = {
                    fadeIn() with fadeOut()
                },
                label = "ScreenStateAnimation"
            ) { targetState ->
                when (targetState) {
                    ScreenState::START -> {
                        StartScreen(
                            onStart = {
                                currentState = ScreenState::CHOOSE_LAYOUT
                            }
                        )
                    }
                    ScreenState::CHOOSE_LAYOUT -> {
                        ChooseLayoutScreen(
                            options = androidPhotoChoices,
                            onChoose = { count ->
                                selectedPhotoCount = count
                                capturedBitmaps.clear()
                                currentCaptureIndex = 0
                                currentState = ScreenState::CAPTURE
                            },
                            onBack = {
                                currentState = ScreenState::START
                            }
                        )
                    }
                    ScreenState::CAPTURE -> {
                        CaptureScreen(
                            currentIdx = currentCaptureIndex,
                            totalCount = selectedPhotoCount,
                            onPhotoCaptured = { bitmap ->
                                reviewBitmap = bitmap
                                currentState = ScreenState::RETAKE_REVIEW
                            }
                        )
                    }
                    ScreenState::RETAKE_REVIEW -> {
                        ReviewScreen(
                            bitmap = reviewBitmap,
                            currentIdx = currentCaptureIndex,
                            onRetake = {
                                reviewBitmap = null
                                currentState = ScreenState::CAPTURE
                            },
                            onKeep = {
                                reviewBitmap?.let {
                                    capturedBitmaps.add(it)
                                    if (capturedBitmaps.size < selectedPhotoCount) {
                                        currentCaptureIndex++
                                        currentState = ScreenState::CAPTURE
                                    } else {
                                        // Completed all snaps! Compile receipt
                                        CoroutineScope(Dispatchers.Default).launch {
                                            val compiled = ReceiptRenderer.compile80mmReceipt(
                                                photos = capturedBitmaps.toList(),
                                                receiptTitle = receiptTitle.value,
                                                receiptSubtitle = receiptSubtitle.value,
                                                receiptSlogan = receiptSlogan.value
                                            )
                                            withContext(Dispatchers.Main) {
                                                resultBitmap = compiled
                                                currentState = ScreenState::RESULT
                                            }
                                        }
                                    }
                                }
                            }
                        )
                    }
                    ScreenState::RESULT -> {
                        ResultScreen(
                            bitmap = resultBitmap,
                            onDone = {
                                // Recycle and clean cache
                                capturedBitmaps.forEach { it.recycle() }
                                capturedBitmaps.clear()
                                resultBitmap?.recycle()
                                resultBitmap = null
                                currentState = ScreenState::START
                            }
                        )
                    }
                }
            }
        }
    }

    @Composable
    fun StartScreen(onStart: () -> Unit) {
        val inkColor = Color(0xFF1A1A2E)
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFFFFDF5))
                .padding(32.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header Info
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 40.dp)
            ) {
                Text(
                    text = "LDR THERMAL BOOTH",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFFF6B9D),
                    letterSpacing = 2.sp
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = receiptTitle.value.uppercase(Locale.getDefault()),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    color = inkColor,
                    textAlign = TextAlign.Center,
                    lineHeight = 40.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = receiptSubtitle.value,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF8D99AE),
                    textAlign = TextAlign.Center
                )
            }

            // Clean Minimal Swiss Banner Image Mock
            Box(
                modifier = Modifier
                    .size(240.dp)
                    .clip(RoundedCornerShape(32.dp))
                    .background(Color(0xFFFFF4F5))
                    .border(3.dp, inkColor, RoundedCornerShape(32.dp))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "80MM",
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Black,
                        color = inkColor
                    )
                    Text(
                        text = "THERMAL COLLAGE",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFF6B9D),
                        letterSpacing = 1.sp
                    )
                }
            }

            // Big Start Button
            Button(
                onClick = onStart,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .border(3.dp, inkColor, RoundedCornerShape(20.dp)),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD93D)),
                shape = RoundedCornerShape(20.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
            ) {
                Text(
                    text = "TAP TO SNAP 📸",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = inkColor
                )
            }
        }
    }

    @Composable
    fun ChooseLayoutScreen(
        options: List<Int>,
        onChoose: (Int) -> Unit,
        onBack: () -> Unit
    ) {
        val inkColor = Color(0xFF1A1A2E)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFFFFDF5))
                .padding(28.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(48.dp)
                        .background(Color.White, CircleShape)
                        .border(2.dp, inkColor, CircleShape)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = inkColor)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = "CHOOSE COLLAGE COUNT",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = inkColor
                )
            }

            // Options list
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                options.forEach { count ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(90.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(Color.White)
                            .border(3.dp, inkColor, RoundedCornerShape(20.dp))
                            .clickable { onChoose(count) }
                            .padding(horizontal = 24.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(Color(0xFFFFF4F5), CircleShape)
                                    .border(2.dp, inkColor, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = count.toString(),
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = inkColor
                                )
                            }
                            Spacer(modifier = Modifier.width(18.dp))
                            Text(
                                text = "CLASSIC $count PHOTOS",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = inkColor
                            )
                        }
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = inkColor,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }

            // Spacer to keep layout pretty
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    @Composable
    fun CaptureScreen(
        currentIdx: Int,
        totalCount: Int,
        onPhotoCaptured: (Bitmap) -> Unit
    ) {
        val inkColor = Color(0xFF1A1A2E)
        val context = LocalContext.current
        val lifecycleOwner = LocalLifecycleOwner.current

        var countdown by remember { mutableIntStateOf(3) }
        var isTimerActive by remember { mutableStateOf(true) }
        var flashActive by remember { mutableStateOf(false) }

        val previewView = remember { PreviewView(context) }

        // Start Countdown Loop
        LaunchedEffect(isTimerActive) {
            if (isTimerActive) {
                countdown = 3
                while (countdown > 0) {
                    delay(1000)
                    countdown--
                }
                
                // Triggers visual flash overlay
                flashActive = true
                delay(120)
                flashActive = false
                
                // Snap Image
                imageCapture?.let { capture ->
                    capture.takePicture(
                        cameraExecutor,
                        object : ImageCapture.OnImageCapturedCallback() {
                            override fun onCaptureSuccess(image: ImageProxy) {
                                val buffer = image.planes[0].buffer
                                val bytes = ByteArray(buffer.remaining())
                                buffer.get(bytes)
                                
                                val rawBmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                
                                // Rotate bitmap properly
                                val rotation = image.imageInfo.rotationDegrees
                                val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
                                val rotatedBmp = Bitmap.createBitmap(
                                    rawBmp, 0, 0, rawBmp.width, rawBmp.height, matrix, true
                                )
                                
                                image.close()
                                
                                CoroutineScope(Dispatchers.Main).launch {
                                    onPhotoCaptured(rotatedBmp)
                                }
                            }
                        }
                    )
                }
            }
        }

        // Bind CameraX Lifecycle
        LaunchedEffect(Unit) {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
                
                imageCapture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .build()

                val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner, cameraSelector, preview, imageCapture
                    )
                } catch (e: Exception) {
                    Log.e("CaptureScreen", "Camera binding failed: ${e.message}")
                }
            }, ContextCompat.getMainExecutor(context))
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(inkColor)
        ) {
            // Viewfinder
            AndroidView(
                factory = { previewView },
                modifier = Modifier.fillMaxSize()
            )

            // Grid guidelines (Authentic photobooth overlay)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(16.dp, inkColor)
            ) {
                // Crosshairs grid lines
                Row(modifier = Modifier.fillMaxSize()) {
                    Spacer(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Spacer(modifier = Modifier.weight(1f).fillMaxHeight().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Spacer(modifier = Modifier.weight(1f))
                }
                Column(modifier = Modifier.fillMaxSize()) {
                    Spacer(modifier = Modifier.weight(1f).fillMaxWidth().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Spacer(modifier = Modifier.weight(1f).fillMaxWidth().border(0.5.dp, Color.White.copy(alpha = 0.3f)))
                    Spacer(modifier = Modifier.weight(1f))
                }
            }

            // Top overlay bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "CAPTURING ${currentIdx + 1} OF $totalCount",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
                
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFFF6B9D))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "POSE",
                        color = inkColor,
                        fontWeight = FontWeight.Black,
                        fontSize = 12.sp
                    )
                }
            }

            // Visual Countdown Overlay
            if (countdown > 0) {
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .align(Alignment.Center)
                        .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        .border(3.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = countdown.toString(),
                        color = Color.White,
                        fontSize = 72.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            // Shutter Flash overlay
            if (flashActive) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.White)
                )
            }
        }
    }

    @Composable
    fun ReviewScreen(
        bitmap: Bitmap?,
        currentIdx: Int,
        onRetake: () -> Unit,
        onKeep: () -> Unit
    ) {
        val inkColor = Color(0xFF1A1A2E)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFFFFDF5))
                .padding(28.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Title
            Text(
                text = "REVIEW PHOTO ${currentIdx + 1}",
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = inkColor,
                modifier = Modifier.padding(top = 10.dp)
            )

            // Render Preview container
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(vertical = 24.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.White)
                    .border(3.dp, inkColor, RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                bitmap?.let {
                    Image(
                        bitmap = it.asImageBitmap(),
                        contentDescription = "Preview Image",
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Button(
                    onClick = onRetake,
                    modifier = Modifier
                        .weight(1f)
                        .height(60.dp)
                        .border(3.dp, inkColor, RoundedCornerShape(16.dp)),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = "RETAKE  WIPE",
                        color = inkColor,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp
                    )
                }

                Button(
                    onClick = onKeep,
                    modifier = Modifier
                        .weight(1.2f)
                        .height(60.dp)
                        .border(3.dp, inkColor, RoundedCornerShape(16.dp)),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF06D6A0)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = "KEEP   NEXT ✌️",
                        color = inkColor,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp
                    )
                }
            }
        }
    }

    @Composable
    fun ResultScreen(
        bitmap: Bitmap?,
        onDone: () -> Unit
    ) {
        val inkColor = Color(0xFF1A1A2E)
        val context = LocalContext.current
        var autoTimer by remember { mutableIntStateOf(25) }

        // Session Auto-Timeout reset (Mirroring C++ photobooth)
        LaunchedEffect(Unit) {
            while (autoTimer > 0) {
                delay(1000)
                autoTimer--
            }
            onDone()
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFFFFDF5))
                .padding(24.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "80MM THERMAL TICKET",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = inkColor
                )
                
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFFFD93D))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = "RESET IN ${autoTimer}S",
                        color = inkColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            // Ticket Scrollable Container
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(vertical = 20.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White)
                    .border(3.dp, inkColor, RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                bitmap?.let {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        item {
                            Image(
                                bitmap = it.asImageBitmap(),
                                contentDescription = "Final Receipt Ticket",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .wrapContentHeight()
                            )
                        }
                    }
                }
            }

            // Bottom Buttons
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Download/Save
                    Button(
                        onClick = {
                            bitmap?.let {
                                saveBitmapToGallery(context, it)
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .border(3.dp, inkColor, RoundedCornerShape(16.dp)),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Download, contentDescription = null, tint = inkColor)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("DOWNLOAD", color = inkColor, fontWeight = FontWeight.Black)
                        }
                    }

                    // Print Receipt
                    Button(
                        onClick = {
                            bitmap?.let {
                                printBitmapReceipt(context, it)
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .border(3.dp, inkColor, RoundedCornerShape(16.dp)),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF6B9D)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Print, contentDescription = null, tint = inkColor)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("PRINT TICKET", color = inkColor, fontWeight = FontWeight.Black)
                        }
                    }
                }

                // Done & Finish
                Button(
                    onClick = onDone,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .border(3.dp, inkColor, RoundedCornerShape(16.dp)),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD93D)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("FINISHED, RESET SESSION ✌️", color = inkColor, fontWeight = FontWeight.Black)
                }
            }
        }
    }

    private fun saveBitmapToGallery(context: Context, bitmap: Bitmap) {
        val filename = "LDR_thermal_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date()) + ".png"
        
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/LdrPhotobooth")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }

        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }

        val resolver = context.contentResolver
        val uri = resolver.insert(collection, values)

        if (uri != null) {
            try {
                resolver.openOutputStream(uri).use { stream ->
                    if (stream != null) {
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
                    }
                }
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.clear()
                    values.put(MediaStore.Images.Media.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                }
                
                Toast.makeText(context, "Saved to Gallery/Pictures/LdrPhotobooth! ✨", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                resolver.delete(uri, null, null)
                Toast.makeText(context, "Download failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(context, "Could not insert media entry.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun printBitmapReceipt(context: Context, bitmap: Bitmap) {
        val printHelper = PrintHelper(context)
        printHelper.scaleMode = PrintHelper.SCALE_MODE_FIT
        val jobName = "LDR_Receipt_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        printHelper.printBitmap(jobName, bitmap)
    }
}

// --- Premium harmonized visual theme ---
@Composable
fun LdrPhotoboothTheme(content: @Composable () -> Unit) {
    val lightColorScheme = lightColorScheme(
        primary = Color(0xFFFF6B9D),
        secondary = Color(0xFFFFD93D),
        background = Color(0xFFFFFDF5),
        surface = Color.White,
        onPrimary = Color(0xFF1A1A2E),
        onSecondary = Color(0xFF1A1A2E),
        onBackground = Color(0xFF1A1A2E),
        onSurface = Color(0xFF1A1A2E)
    )

    MaterialTheme(
        colorScheme = lightColorScheme,
        typography = Typography(
            bodyLarge = androidx.compose.ui.text.TextStyle(
                fontFamily = FontFamily.SansSerif,
                fontWeight = FontWeight.Normal,
                fontSize = 16.sp,
                lineHeight = 24.sp,
                letterSpacing = 0.5.sp
            )
        ),
        content = content
    )
}
