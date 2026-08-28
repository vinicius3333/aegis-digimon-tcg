// On-device OCR via the macOS Vision framework. Used by index-rules.mjs to read
// image-only rule PDFs (e.g. the Official Rule Manual) that have no text layer.
//
// Usage: swift ocr.swift <image1> [image2 ...]
// Prints recognized text per image (reading order: top row first, then left to
// right), separated by a blank line between images.

import Foundation
import Vision
import AppKit

func ocr(_ path: String) -> String {
  guard let image = NSImage(contentsOfFile: path),
        let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("warn: cannot load \(path)\n".data(using: .utf8)!)
    return ""
  }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true

  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  do {
    try handler.perform([request])
  } catch {
    FileHandle.standardError.write("warn: OCR failed for \(path): \(error)\n".data(using: .utf8)!)
    return ""
  }

  let observations = request.results ?? []
  let lines: [(CGRect, String)] = observations.compactMap {
    guard let top = $0.topCandidates(1).first else { return nil }
    return ($0.boundingBox, top.string)
  }
  let sorted = lines.sorted { a, b in
    if abs(a.0.midY - b.0.midY) > 0.018 { return a.0.midY > b.0.midY }
    return a.0.minX < b.0.minX
  }
  return sorted.map { $0.1 }.joined(separator: "\n")
}

let paths = Array(CommandLine.arguments.dropFirst())
guard !paths.isEmpty else {
  FileHandle.standardError.write("usage: ocr.swift <image1> [image2 ...]\n".data(using: .utf8)!)
  exit(1)
}
for path in paths {
  print(ocr(path))
  print("")
}
