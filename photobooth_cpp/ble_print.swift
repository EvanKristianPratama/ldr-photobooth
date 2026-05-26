#!/usr/bin/env swift
// BLE Printing Tool for macOS
// Scans for RPP02N (including checking Unknown devices with strong RSSI)
// and prints a test ESC/POS message if found.

import Foundation
import CoreBluetooth

class BLEPrinterConnector: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    var central: CBCentralManager!
    var targetPeripheral: CBPeripheral?
    var writeCharacteristic: CBCharacteristic?
    
    let targetName = "RPP02N"
    let targetServiceUUID = CBUUID(string: "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2")
    let targetCharUUID = CBUUID(string: "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F")
    
    var attemptedUUIDs = Set<UUID>()
    var isPrinting = false
    
    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            print("[BLE] Bluetooth is ON. Scanning for printer...")
            // Scan for all devices
            central.scanForPeripherals(withServices: nil, options: nil)
            
            // Timeout after 15 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
                if self.targetPeripheral == nil {
                    print("[BLE] ERROR: Printer RPP02N not found or could not connect within 15 seconds.")
                    exit(1)
                }
            }
        } else {
            print("[BLE] ERROR: Bluetooth is not available (state: \(central.state.rawValue))")
            exit(1)
        }
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                         advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? "Unknown"
        let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? ""
        let serviceUUIDs = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] ?? []
        
        let matchByName = name.lowercased().contains(targetName.lowercased()) || 
                          localName.lowercased().contains(targetName.lowercased())
        
        let matchByService = serviceUUIDs.contains(targetServiceUUID)
        
        // If RSSI is very strong (e.g. > -65 dB) and we haven't tried connecting to it yet,
        // we'll try connecting to see if it's the printer (since BLE names can be cached as "Unknown")
        let strongSignal = RSSI.intValue > -65 && !attemptedUUIDs.contains(peripheral.identifier)
        
        if matchByName || matchByService || strongSignal {
            print("[BLE] Discovered candidate: Name: '\(name)', LocalName: '\(localName)', UUID: \(peripheral.identifier.uuidString) (RSSI: \(RSSI) dB)")
            
            if strongSignal && !matchByName && !matchByService {
                print("[BLE] Strong signal candidate. Connecting to verify identity...")
            } else {
                print("[BLE] Printer match found! Connecting...")
            }
            
            attemptedUUIDs.insert(peripheral.identifier)
            
            // Stop scanning and connect
            central.stopScan()
            self.targetPeripheral = peripheral
            peripheral.delegate = self
            central.connect(peripheral, options: nil)
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        let name = peripheral.name ?? "Unknown"
        print("[BLE] Connected to: \(name) (UUID: \(peripheral.identifier.uuidString))")
        print("[BLE] Discovering services...")
        peripheral.discoverServices(nil)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("[BLE] Failed to connect: \(error?.localizedDescription ?? "unknown error")")
        resumeScanning()
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("[BLE] Disconnected from \(peripheral.name ?? "device")")
        if !isPrinting {
            resumeScanning()
        } else {
            print("[BLE] Done.")
            exit(0)
        }
    }
    
    func resumeScanning() {
        print("[BLE] Resuming scan...")
        self.targetPeripheral = nil
        self.writeCharacteristic = nil
        central.scanForPeripherals(withServices: nil, options: nil)
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            print("[BLE] Service discovery error: \(error.localizedDescription)")
            central.cancelPeripheralConnection(peripheral)
            return
        }
        
        guard let services = peripheral.services else {
            print("[BLE] No services found.")
            central.cancelPeripheralConnection(peripheral)
            return
        }
        
        print("[BLE] Found \(services.count) services:")
        for service in services {
            print("  Service: \(service.uuid.uuidString)")
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            print("[BLE] Characteristic discovery error: \(error.localizedDescription)")
            return
        }
        
        guard let characteristics = service.characteristics else { return }
        
        for char in characteristics {
            let isWritable = char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse)
            print("    Char: \(char.uuid.uuidString) (Writable: \(isWritable))")
            
            // Check if this matches our printer characteristic
            if char.uuid.uuidString.lowercased() == targetCharUUID.uuidString.lowercased() ||
               (isWritable && (service.uuid.uuidString.lowercased() == targetServiceUUID.uuidString.lowercased() || 
                              service.uuid.uuidString.contains("E781") ||
                              char.uuid.uuidString.contains("BEF8"))) {
                
                print("[BLE] SUCCESS: Found Writable Printer Characteristic!")
                print("[BLE] Service: \(service.uuid.uuidString)")
                print("[BLE] Char:    \(char.uuid.uuidString)")
                
                self.writeCharacteristic = char
                sendTestPrint(peripheral, characteristic: char)
                return
            }
        }
        
        // If we finished discovering all characteristics and haven't found our printer,
        // let's check if there's any fallback writable characteristic on a custom service
        let allDiscovered = peripheral.services?.allSatisfy { svc in
            svc.characteristics != nil
        } ?? false
        
        if allDiscovered && self.writeCharacteristic == nil {
            // Find any writable characteristic as fallback
            for svc in peripheral.services ?? [] {
                for char in svc.characteristics ?? [] {
                    let isWritable = char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse)
                    if isWritable && svc.uuid.uuidString.lengthOfBytes(using: .utf8) > 4 { // Avoid standard services like battery/device info
                        print("[BLE] Fallback: Using writable characteristic \(char.uuid.uuidString) on service \(svc.uuid.uuidString)")
                        self.writeCharacteristic = char
                        sendTestPrint(peripheral, characteristic: char)
                        return
                    }
                }
            }
            
            print("[BLE] This device is not a printer. Disconnecting...")
            central.cancelPeripheralConnection(peripheral)
        }
    }
    
    func sendTestPrint(_ peripheral: CBPeripheral, characteristic: CBCharacteristic) {
        self.isPrinting = true
        print("[BLE] Sending test print payload...")
        
        // ESC @ (Init) + "HELLO PRINTER FROM BLE!\n\n\n" + feed
        var payload = Data()
        payload.append(contentsOf: [0x1B, 0x40]) // ESC @
        
        let text = "\n================================\n  HELLO PRINTER FROM MACOS BLE!\n================================\n\n\n\n\n"
        if let textData = text.data(using: .ascii) {
            payload.append(textData)
        }
        
        // Cut paper command: GS V 66 0 (0x1D 0x56 0x42 0x00)
        payload.append(contentsOf: [0x1D, 0x56, 0x42, 0x00])
        
        // Send data in chunks of 20 bytes (standard for BLE GATT)
        let chunkSize = 20
        var offset = 0
        
        let writeType: CBCharacteristicWriteType = characteristic.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse
        
        print("[BLE] Writing \(payload.count) bytes in 20-byte chunks...")
        while offset < payload.count {
            let chunkRange = offset..<min(offset + chunkSize, payload.count)
            let chunk = payload.subdata(in: chunkRange)
            peripheral.writeValue(chunk, for: characteristic, type: writeType)
            offset += chunk.count
            usleep(15000) // 15ms delay between BLE writes
        }
        
        print("[BLE] All data sent successfully!")
        
        // Disconnect after 2 seconds to let the printer process
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            print("[BLE] Disconnecting...")
            self.central.cancelPeripheralConnection(peripheral)
        }
    }
}

let printerConnector = BLEPrinterConnector()
RunLoop.main.run(until: Date(timeIntervalSinceNow: 18))
