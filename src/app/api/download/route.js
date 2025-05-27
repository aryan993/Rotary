// src/app/api/download/route.js
import { Storage } from 'megajs'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    
    const { MEGA_EMAIL, MEGA_PASSWORD } = process.env

    if (!MEGA_EMAIL || !MEGA_PASSWORD) {
      return NextResponse.json(
        { message: 'Server configuration error' },
        { status: 500 }
      )
    }

    let { fileName } = await req.json()
    console.log(fileName)
    if (!fileName) {
      return NextResponse.json(
        { message: 'File name is required' },
        { status: 400 }
      )
    }

    // Append .jpg if no extension is present
    if (!fileName.toLowerCase().endsWith('.jpg')) {
      fileName += '.jpg'
    }

    // Authenticate with MEGA
    const storage = new Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
    })

    await new Promise((resolve, reject) => {
      storage.on('ready', resolve)
      storage.on('error', reject)
    })

    const files = storage.root.children || []
    const file = files.find(f => f.name === fileName)

    if (!file) {
      return NextResponse.json(
        { message: 'File not found' },
        { status: 404 }
      )
    }

    const buffer = await new Promise((resolve, reject) => {
      const chunks = []
      file.download()
        .on('data', chunk => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject)
    })

    const mimeType = file.attributes?.mime || 'image/jpeg'
    const base64 = buffer.toString('base64')
    const downloadUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({
      downloadUrl,
      fileName: file.name,
      message: 'File ready for download'
    })

  } catch (error) {
    console.error('MEGA download error:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to download file from MEGA' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}
