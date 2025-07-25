import { NextResponse } from 'next/server';
import { supabase } from "@/app/utils/dbconnect";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    let id = formData.get('id');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name;
    const extension = '.jpg';
    if (!id) {
      id = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    }
    const key = `${id}${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Check if file already exists


    // Upload the new file
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: 'image/jpeg'
    }));

    // Update Supabase: set profile = true
    const { error: dbError } = await supabase
      .from("user")
      .update({ profile: true })
      .eq("id", id);

    if (dbError) {
      console.error('Supabase update error:', dbError);
      return NextResponse.json(
        { error: 'File uploaded but failed to update database', details: dbError.message },
        { status: 500 }
      );
    }

    const publicUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;

    return NextResponse.json({
      success: true,
      message: 'File uploaded and profile updated successfully',
      file: {
        name: key,
        size: fileBuffer.length,
        url: publicUrl
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}


//import { NextResponse } from 'next/server';
//import { Storage } from 'megajs';
//import { supabase } from "@/app/utils/dbconnect";
//
//export async function POST(request) {
//    try {
//        const formData = await request.formData();
//        const file = formData.get('file');
//        let id = formData.get('id');
//
//        if (!file) {
//            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
//        }
//
//        // Default to original filename without extension if no ID is provided
//        if (!id) {
//            const originalName = file.name;
//            id = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
//        }
//
//        const fileBuffer = Buffer.from(await file.arrayBuffer());
//
//        // Initialize MEGA storage
//        const storage = await new Storage({
//            email: process.env.MEGA_EMAIL,
//            password: process.env.MEGA_PASSWORD,
//        }).ready;
//
//        const jpgFilename = `${id}.jpg`;
//
//        // Check if a file with the same name exists and delete it
//        const existingFile = storage.root.children.find(child => child.name === jpgFilename);
//        if (existingFile) {
//            await existingFile.delete(true); // force delete
//        }
//
//        // Upload the file as a .jpg
//        const uploadedFile = await storage.upload(jpgFilename, fileBuffer).complete;
//
//        // Update Supabase record to set profile: true
//        const { error: dbError } = await supabase
//            .from("user")
//            .update({ profile: true })
//            .eq("id", id);
//
//        if (dbError) {
//            console.error('Supabase update error:', dbError);
//            return NextResponse.json(
//                { error: 'File uploaded but failed to update database', details: dbError.message },
//                { status: 500 }
//            );
//        }
//
//        return NextResponse.json({
//            success: true,
//            message: 'File uploaded and profile updated successfully',
//            file: {
//                name: uploadedFile.name,
//                size: uploadedFile.size,
//                url: await uploadedFile.link()
//            }
//        });
//
//    } catch (error) {
//        console.error('Upload error:', error);
//        return NextResponse.json(
//            { error: 'Failed to upload file', details: error.message },
//            { status: 500 }
//        );
//    }
//}
//