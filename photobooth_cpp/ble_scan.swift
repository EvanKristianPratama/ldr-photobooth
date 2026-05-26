#!/usr/bin/env swift
// BLE GATT Service Scanner for RPP02N Thermal Printer
// Discovers all services and characteristics exposed by the printer

import Foundation
import CoreBluetooth

class BLEScanner: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    var central: CBCentralManager!
    var targetPeripheral: CBPeripheral?
    let targetName = "RPP02N"
    var discoveredServices: [(String, String)] = [] // (serviceUUID, charUUID)
    
    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            print("[BLE] Bluetooth is ON. Scanning for \(targetName)...")
            central.scanForPeripherals(withServices: nil, options: nil)
            
            // Timeout after 10 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                if self.targetPeripheral == nil {
                    print("[BLE] ERROR: Could not find \(self.targetName) within 10 seconds.")
                    print("[BLE] Make sure printer is ON and paired.")
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
        let uuidsStr = serviceUUIDs.map { $0.uuidString }.joined(separator: ", ")
        
        print("[BLE] Discovered device: \(name) | LocalName: \(localName) | UUID: \(peripheral.identifier.uuidString) | Services: [\(uuidsStr)] (RSSI: \(RSSI))")
        
        let lowerName = name.lowercased()
        let lowerLocalName = localName.lowercased()
        let isPrinter = lowerName.contains(targetName.lowercased()) || 
                        lowerLocalName.contains(targetName.lowercased()) ||
                        lowerName.contains("printer") || 
                        lowerLocalName.contains("printer") ||
                        uuidsStr.contains("18F0") || 
                        uuidsStr.contains("E781")
                        
        if isPrinter {
            print("[BLE] MATCH FOUND: Name: \(name), LocalName: \(localName) (RSSI: \(RSSI))")
            print("[BLE] Connecting...")
            self.targetPeripheral = peripheral
            peripheral.delegate = self
            central.stopScan()
            central.connect(peripheral, options: nil)
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("[BLE] CONNECTED to \(peripheral.name ?? "printer")")
        print("[BLE] Discovering services...\n")
        peripheral.discoverServices(nil)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("[BLE] ERROR: Failed to connect: \(error?.localizedDescription ?? "unknown")")
        exit(1)
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else {
            print("[BLE] No services found!")
            exit(1)
        }
        
        print("[BLE] Found \(services.count) services:\n")
        for service in services {
            print("  SERVICE: \(service.uuid.uuidString)")
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let chars = service.characteristics else { return }
        
        print("\n  SERVICE: \(service.uuid.uuidString)")
        for char in chars {
            var props: [String] = []
            if char.properties.contains(.read) { props.append("READ") }
            if char.properties.contains(.write) { props.append("WRITE") }
            if char.properties.contains(.writeWithoutResponse) { props.append("WRITE_NO_RESP") }
            if char.properties.contains(.notify) { props.append("NOTIFY") }
            if char.properties.contains(.indicate) { props.append("INDICATE") }
            
            let propsStr = props.joined(separator: ", ")
            print("    CHAR: \(char.uuid.uuidString)  [\(propsStr)]")
            
            if char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse) {
                discoveredServices.append((service.uuid.uuidString, char.uuid.uuidString))
            }
        }
        
        // Check if we've discovered all services' characteristics
        let allDiscovered = peripheral.services?.allSatisfy { svc in
            svc.characteristics != nil
        } ?? false
        
        if allDiscovered {
            print("\n" + String(repeating: "=", count: 60))
            print("WRITABLE CHARACTERISTICS (candidates for ESC/POS printing):")
            print(String(repeating: "=", count: 60))
            for (svc, chr) in discoveredServices {
                print("  Service: \(svc)")
                print("  Char:    \(chr)")
                print("")
            }
            
            if discoveredServices.isEmpty {
                print("  No writable characteristics found!")
            }
            
            // Done
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                exit(0)
            }
        }
    }
}

let scanner = BLEScanner()
RunLoop.main.run(until: Date(timeIntervalSinceNow: 15))
