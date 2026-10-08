// Kelime Köprüsü — iCloud anahtar-değer yedeği için yerel Capacitor eklentisi.
//
// Bu dosya Xcode projesine (ios/App/App/) eklenir; ayrıca bir ViewController'da
// kaydedilir (MAC-YONERGESI.md §4b). Web tarafı: src/platform/cloud.ts ("ICloudKV").
//
// Veri, kullanıcının kendi iCloud hesabında (NSUbiquitousKeyValueStore) durur:
// en çok 1 MB, 1024 anahtar. Her cihaz kendi anahtarına yazar
// ("kelime-oyunu.yedek.<cihaz>"), yani cihazlar birbirinin yedeğini ezmez.
//
// Gerekli yetenek: Signing & Capabilities → + iCloud → "Key-value storage".
//
// NOT: Bu dosya Windows'ta yazıldı; Xcode'da derlenip gerçek cihazda denenmedi.

import Foundation
import Capacitor

@objc(ICloudKVPlugin)
public class ICloudKVPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudKVPlugin"
    public let jsName = "ICloudKV"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keys", returnType: CAPPluginReturnPromise),
    ]

    private let store = NSUbiquitousKeyValueStore.default

    override public func load() {
        // iCloud'daki son değerleri indirmeyi başlatır (eşzamansız; ilk açılışta gecikebilir).
        store.synchronize()
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key gerekli")
            return
        }
        if let value = store.string(forKey: key) {
            call.resolve(["value": value])
        } else {
            call.resolve([:])
        }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("key ve value gerekli")
            return
        }
        store.set(value, forKey: key)
        store.synchronize()
        call.resolve()
    }

    @objc func keys(_ call: CAPPluginCall) {
        let prefix = call.getString("prefix") ?? ""
        let keys = store.dictionaryRepresentation.keys.filter { $0.hasPrefix(prefix) }
        call.resolve(["keys": Array(keys)])
    }
}

// --- Kayıt (ayrı dosya: ios/App/App/MainViewController.swift) ---
//
// import Capacitor
//
// class MainViewController: CAPBridgeViewController {
//     override open func capacitorDidLoad() {
//         bridge?.registerPluginInstance(ICloudKVPlugin())
//     }
// }
//
// Main.storyboard → Bridge View Controller → Identity Inspector → Custom Class:
// MainViewController (Module: App).
