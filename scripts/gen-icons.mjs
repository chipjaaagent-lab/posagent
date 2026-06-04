// สร้างไอคอน PNG สำหรับ PWA โดยไม่พึ่ง dependency ภายนอก
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

// ── CRC32 ──
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  // raw with filter byte per row
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ── วาดไอคอน: พื้นส้ม + วงกลมครีม (พิซซ่า) + จุดแดง ──
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2
  const rOuter = size * 0.40   // ขอบพิซซ่า
  const rInner = size * 0.34   // หน้าพิซซ่า
  const radius = size * 0.22   // มุมโค้งพื้นหลัง
  // หน้าปัดสี
  const ORANGE = [255, 107, 53]
  const CRUST = [241, 180, 90]
  const CHEESE = [255, 224, 168]
  const PEPP = [220, 60, 50]

  function set(x, y, c) {
    const i = (y * size + x) * 4
    buf[i] = c[0]; buf[i+1] = c[1]; buf[i+2] = c[2]; buf[i+3] = 255
  }
  // จุดเปปเปอโรนี
  const pepps = [[0.40, 0.40], [0.60, 0.42], [0.45, 0.60], [0.62, 0.62], [0.52, 0.50]]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // พื้นหลังโค้งมน
      const inCornerX = Math.min(x, size - 1 - x)
      const inCornerY = Math.min(y, size - 1 - y)
      let bg = true
      if (inCornerX < radius && inCornerY < radius) {
        const dx = radius - inCornerX, dy = radius - inCornerY
        if (dx * dx + dy * dy > radius * radius) bg = false
      }
      if (!bg) { buf[(y*size+x)*4+3] = 0; continue }
      set(x, y, ORANGE)

      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist <= rOuter) set(x, y, CRUST)
      if (dist <= rInner) {
        set(x, y, CHEESE)
        for (const [px, py] of pepps) {
          const pdx = x - px*size, pdy = y - py*size
          if (pdx*pdx + pdy*pdy <= (size*0.045)**2) set(x, y, PEPP)
        }
      }
    }
  }
  return buf
}

mkdirSync(new URL('../public', import.meta.url), { recursive: true })
const out = (name, size) => {
  const png = encodePNG(size, size, drawIcon(size))
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png)
  console.log(`✓ ${name} (${size}x${size}, ${png.length} bytes)`)
}
out('pwa-192x192.png', 192)
out('pwa-512x512.png', 512)
out('apple-touch-icon.png', 180)
out('favicon-48.png', 48)
console.log('done')
