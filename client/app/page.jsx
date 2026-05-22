'use client';

import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import FrameSelectScreen from './components/screens/FrameSelectScreen';
import JoinRoomScreen from './components/screens/JoinRoomScreen';
import WaitRoomScreen from './components/screens/WaitRoomScreen';
import LayoutSelectScreen from './components/screens/LayoutSelectScreen';
import CaptureScreen from './components/screens/CaptureScreen';
import ResultScreen from './components/screens/ResultScreen';
import CheckoutScreen from './components/screens/CheckoutScreen';
import InvoiceScreen from './components/screens/InvoiceScreen';
import StepIndicator from './components/ui/StepIndicator';
import LanguagePicker from './components/ui/LanguagePicker';
import HowToUseScreen from './components/screens/HowToUseScreen';
import ModeSelectScreen from './components/screens/ModeSelectScreen';
import CommunityScreen from './components/screens/CommunityScreen';

import useAppController from './hooks/useAppController';

export default function Page() {
  const {
    step, setStep,
    invoiceData,
    SERVER_URL,
    sessionMode, setSessionMode,
    groupSize,
    capturedParticipants,
    selectedLayout,
    progress,
    isFlash,
    donateOpen, setDonateOpen,
    donateQrMissing, setDonateQrMissing,
    locationsById,
    downloadName,
    showHowTo, setShowHowTo,
    activeTab, setActiveTab,
    showUpload, setShowUpload,
    participantsWithSelf,
    room,
    capture,
    frame,
    stepsToDisplay,
    
    // Handlers
    handleModeSelect,
    handleJoin,
    handleGoLayout,
    handleLayoutSelect,
    handleStartBooth,
    handleFinishCapture,
    handleRetakeSession,
    handleRetakeSingle,
    handleGoHome,
    handleDownload,
    handleReapply,
    handleOpenDonate
  } = useAppController();

  const iconBase = "/doodle icons/SVG/interface";

  return (
    <div className={step === 'community' ? 'comm-pin-root' : ''} style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', flexDirection: 'row' }}>
      {isFlash && <div className="flash-effect" />}

      {/* ── GLOBAL EXPANDABLE SIDEBAR (for Community) ── */}
      {step === 'community' && (
        <aside className="comm-pin-sidebar expandable">
          <div className="pin-sidebar-top">
            <div className="pin-logo" onClick={handleGoHome}>
              <img src={`${iconBase}/camera.svg`} className="logo-img" alt="logo" />
              <span className="logo-text">LDR Gallery</span>
            </div>
            <nav className="pin-nav">
              <button className={`pin-nav-item ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>
                <span className="nav-icon"><img src="/doodle icons/SVG/misc/rocket.svg" alt="showcase" /></span>
                <span className="nav-label">Showcase</span>
              </button>
              <button className={`pin-nav-item ${activeTab === 'frames' ? 'active' : ''}`} onClick={() => setActiveTab('frames')}>
                <span className="nav-icon"><img src={`${iconBase}/grid.svg`} alt="frames" /></span>
                <span className="nav-label">Frames</span>
              </button>
              <button className="pin-nav-item" onClick={() => setShowUpload(true)}>
                <span className="nav-icon"><img src={`${iconBase}/upload.svg`} alt="upload" /></span>
                <span className="nav-label">Publish Frame</span>
              </button>
            </nav>
          </div>
          <div className="pin-sidebar-bottom">
            <button className="pin-nav-item" onClick={handleGoHome}>
              <span className="nav-icon"><img src={`${iconBase}/home.svg`} alt="back" /></span>
              <span className="nav-label">Back Home</span>
            </button>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* TOPBAR */}
      {step !== 'community' && (
        <header className="topbar" style={{ flexShrink: 0 }}>
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={handleGoHome}>
            <img src="/Ldr_photobooth.png" alt="LDR Photobooth Logo" style={{ height: '32px', width: 'auto', display: 'block', borderRadius: '4px' }} />
            <span style={{ color: 'var(--ink)', fontSize: '26px', lineHeight: 'normal', verticalAlign: 'middle' }}>LDR Photobooth</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {step !== 'mode-select' && <StepIndicator steps={stepsToDisplay} currentStep={step} />}
            <LanguagePicker />
          </div>
        </header>
      )}

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {step === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px', fontFamily: "'Gaegu', cursive", color: 'var(--ink)' }}>
            <style>{`
              @keyframes ldr-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <div style={{
              width: '60px',
              height: '60px',
              border: '6px solid var(--cream-dk, #eedec9)',
              borderTopColor: 'var(--pink)',
              borderRadius: '50%',
              animation: 'ldr-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
            }} />
            <div style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '0.5px' }}>Memuat Pesanan Anda... ✨</div>
          </div>
        )}

        {step === 'mode-select' && (
          <ModeSelectScreen onSelectMode={handleModeSelect} onShowHelp={() => setShowHowTo(true)} />
        )}

        {step === 'community' && (
          <CommunityScreen 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showUpload={showUpload}
            setShowUpload={setShowUpload}
            onBack={handleGoHome} 
          />
        )}

        {step === 'join' && (
          <>
            <button className="btn-help" onClick={() => setShowHowTo(true)} title="Cara Pakai">?</button>
            <JoinRoomScreen
              displayName={room.displayName}
              setDisplayName={room.setDisplayName}
              roomCode={room.roomCode}
              setRoomCode={room.setRoomCode}
              generateRoomCode={() => room.generateRoomCode(uuidv4)}
              copyRoomCode={room.copyRoomCode}
              showToast={room.showToast}
              onJoin={handleJoin}
              onBack={() => { setStep('mode-select'); setSessionMode(null); }}
              groupSize={groupSize}
            />
          </>
        )}

        {step === 'room' && (
          <WaitRoomScreen
            participants={participantsWithSelf}
            roomCode={room.roomCode}
            copyRoomCode={room.copyRoomCode}
            showToast={room.showToast}
            status={room.status}
            videoRef={capture.videoRef}
            onNext={handleGoLayout}
            onBack={handleGoHome}
            groupSize={groupSize}
          />
        )}

        {step === 'layout-select' && (
          <LayoutSelectScreen
            selectedLayout={selectedLayout}
            onSelectLayout={handleLayoutSelect}
            onStart={handleStartBooth}
            groupSize={groupSize}
            onBack={() => {
              if (sessionMode === 'solo') {
                setStep('mode-select');
                setSessionMode(null);
              } else {
                setStep('room');
              }
            }}
          />
        )}

        {(step === 'countdown' || step === 'processing') && (
          <CaptureScreen
            videoRef={capture.videoRef}
            countdown={capture.countdown}
            totalShots={capture.totalShots}
            currentShotIndex={capture.currentShotIndex}
            progress={progress}
            isProcessing={step === 'processing'}
            localBlobs={capture.localBlobs}
            livePhotoEnabled={capture.livePhotoEnabled}
            setLivePhotoEnabled={capture.setLivePhotoEnabled}
            sessionTimeLeft={capture.sessionTimeLeft}
            onRetake={handleRetakeSession}
            onRetakeSingle={handleRetakeSingle}
            onFinish={() => handleFinishCapture(capture.totalShots)}
            isTransmitting={capture.isTransmitting}
          />
        )}

        {step === 'frame-select' && frame.mergedImage && (
          <FrameSelectScreen
            mergedImage={frame.mergedImage}
            isMerging={frame.isMerging}
            onContinue={() => setStep('result')}
            onReapply={handleReapply}
            localLiveFrames={capture.liveFrames}
            remoteLiveFrames={capture.remoteLiveFrames}
            localBlobs={capture.localBlobs}
            remoteBlobsByPeer={capture.remoteBlobsRef.current}
            locationsById={locationsById}
            mergePhotos={frame.mergePhotos}
            framePresets={frame.framePresets}
            framePresetId={frame.framePresetId}
            selectFramePreset={frame.selectFramePreset}
            frameSrc={frame.frameSrc}
            setFrameSrc={frame.setFrameSrc}
            setFrameName={frame.setFrameName}
            setFrameMode={frame.setFrameMode}
            setFramePresetId={frame.setFramePresetId}
            handleFrameUpload={frame.handleFrameUpload}
            frameName={frame.frameName}
            frameError={frame.frameError}
            frameMode={frame.frameMode}
            frameColor={frame.frameColor}
            setFrameColor={frame.setFrameColor}
            frameTextColor={frame.frameTextColor}
            setFrameTextColor={frame.setFrameTextColor}
            showFrameText={frame.showFrameText}
            setShowFrameText={frame.setShowFrameText}
            getDefaultFrameNames={frame.getDefaultFrameNames}
            locTextLeft={frame.locTextLeft}
            setLocTextLeft={frame.setLocTextLeft}
            locTextRight={frame.locTextRight}
            setLocTextRight={frame.setLocTextRight}
            setLocTextEdited={frame.setLocTextEdited}
            photoFilter={frame.photoFilter}
            setPhotoFilter={frame.setPhotoFilter}
            userData={{ ...room, locationsById }}
            stickers={frame.stickers}
            addSticker={frame.addSticker}
            addRandomSticker={frame.addRandomSticker}
            clearStickers={frame.clearStickers}
            sessionMode={sessionMode}
            orientation={frame.orientation}
            setOrientation={frame.setOrientation}
            participants={capturedParticipants.length > 0 ? capturedParticipants : participantsWithSelf}
            frameFont={frame.frameFont}
            setFrameFont={frame.setFrameFont}
            frameLayout={frame.frameLayout}
            setFrameLayout={frame.setFrameLayout}
            frameDate={frame.frameDate}
            setFrameDate={frame.setFrameDate}
            frameNoise={frame.frameNoise}
            setFrameNoise={frame.setFrameNoise}
            frameGlare={frame.frameGlare}
            setFrameGlare={frame.setFrameGlare}
          />
        )}

        {/* Fallback: refreshed on frame-select/result but blobs are gone */}
        {(step === 'frame-select' || step === 'result') && !frame.mergedImage && !frame.isMerging && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', fontFamily: "'Gaegu', cursive", padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px' }}>📷</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>Session Expired</div>
            <p style={{ fontSize: '18px', opacity: 0.7, maxWidth: '300px' }}>
              Page was refreshed and photo data was lost. Please retake your photos!
            </p>
            <button className="btn-primary" style={{ padding: '14px 32px', fontSize: '18px' }} onClick={handleGoHome}>
              Start Over →
            </button>
          </div>
        )}

        {step === 'result' && frame.mergedImage && (

          <ResultScreen
            mergedImage={frame.mergedImage}
            isMerging={frame.isMerging}
            downloadName={downloadName}
            onEditFrame={() => setStep('frame-select')}
            onHome={handleGoHome}
            onDownload={handleDownload}
            onDonate={handleOpenDonate}
            photoFilter={frame.photoFilter}
            sessionMode={sessionMode}
            selectedFrameId={frame.framePresetId}
            localLiveFrames={capture.liveFrames}
            remoteLiveFrames={capture.remoteLiveFrames}
            localBlobs={capture.localBlobs}
            remoteBlobsByPeer={capture.remoteBlobsRef.current}
            locationsById={locationsById}
            mergePhotos={frame.mergePhotos}
            participants={capturedParticipants.length > 0 ? capturedParticipants : participantsWithSelf}
            frameLayout={frame.frameLayout}
            orientation={frame.orientation}
            onCheckout={() => setStep('checkout')}
          />
        )}

        {step === 'checkout' && frame.mergedImage && (
          <CheckoutScreen
            photoData={frame.mergedImage}
            frameId={frame.framePresetId}
            sessionMode={sessionMode}
            onBack={() => setStep('result')}
            onHome={handleGoHome}
          />
        )}

        {step === 'invoice' && invoiceData && (
          <InvoiceScreen
            orderId={invoiceData.id}
            photoData={invoiceData.photo_url ? `${SERVER_URL}${invoiceData.photo_url}` : null}
            orderTotal={invoiceData.total_price}
            pricing={{
              qty1: JSON.parse(invoiceData.shipping_address_1 || '{}').qty || 1,
              qty2: JSON.parse(invoiceData.shipping_address_2 || '{}').qty || 0,
              shippingCost1: invoiceData.shipping_cost_1,
              shippingCost2: invoiceData.shipping_cost_2,
              adminFee: invoiceData.admin_fee,
            }}
            addr1={JSON.parse(invoiceData.shipping_address_1 || '{}')}
            addr2={JSON.parse(invoiceData.shipping_address_2 || '{}')}
            isSolo={invoiceData.session_mode === 'solo'}
            onHome={handleGoHome}
          />
        )}
      </main>


      {donateOpen && (
        <div className="frame-modal">
          <div className="frame-modal__backdrop" onClick={() => setDonateOpen(false)} />
          <div className="frame-modal__content">
            <div className="frame-modal__header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <div>
                  <h3 className="frame-modal__title">Donate</h3>
                  <p className="frame-modal__subtitle">Pwiiss untuk bayar server hehhe..</p>
                </div>
                <button 
                  onClick={() => setDonateOpen(false)} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '20px', 
                    opacity: 0.3, 
                    cursor: 'pointer',
                    padding: '5px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              {!donateQrMissing ? (
                <img
                  src="/donate-qr.png"
                  alt="Donate QR"
                  style={{ width: '100%', maxWidth: '280px', borderRadius: '12px', border: '3px solid var(--ink)' }}
                  onError={() => setDonateQrMissing(true)}
                />
              ) : (
                <div style={{ textAlign: 'center', fontFamily: 'Caveat', fontSize: '20px' }}>
                  QR belum tersedia.
                </div>
              )}
            </div>

            <div className="frame-modal__footer" style={{ gap: '10px' }}>
              {!donateQrMissing && (
                <a className="btn-primary" href="/donate-qr.png" download style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
                  Download QR
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {showHowTo && <HowToUseScreen onClose={() => setShowHowTo(false)} />}
      
      {/* GLOBAL WATERMARK */}
      {step !== 'community' && (
        <div 
          className="credits" 
          style={{ 
            position: 'fixed', 
            bottom: '12px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 9999, 
            pointerEvents: 'none', 
            opacity: 0.9, 
            fontSize: '13px',
            fontFamily: "'Gaegu', cursive",
            color: 'var(--ink)',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: 'none',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            margin: 0
          }}
        >
          by{' '}
          <a 
            href="https://www.instagram.com/evankristiannn/" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              color: 'var(--pink)', 
              fontWeight: '700', 
              textDecoration: 'underline', 
              pointerEvents: 'auto' 
            }}
          >
            evan kristian
          </a>
          <span style={{ color: 'var(--ink)', opacity: 0.4, margin: '0 2px' }}>•</span>
          <span style={{ fontWeight: '700', color: 'var(--ink)', opacity: 0.7 }}>v1.2.1</span>
        </div>
      )}
      </div>
    </div>
  );
}
