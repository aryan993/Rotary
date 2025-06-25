import { NextResponse } from 'next/server';
import { Storage } from 'megajs';
import { supabase } from "@/app/utils/dbconnect";

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        let id = formData.get('id');
        let category = formData.get('category')

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Default to original filename without extension if no ID is provided
        if (!id) {
            const originalName = file.name;
            id = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        }

        //   if(category){
        //       console.log("category recieved"+category)
        //               return NextResponse.json(
        //       { error: 'category recieved'},
        //       { status: 500 }
        //   );
        //   }

        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Initialize MEGA storage
        const storage = await new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD,
        }).ready;

        const jpgFilename = category ? `${id}_anniv.jpg` : `${id}_poster.jpg`;

        // Check if a file with the same name exists and delete it
        const existingFile = storage.root.children.find(child => child.name === jpgFilename);
        if (existingFile) {
            await existingFile.delete(true); // force delete
        }

        // Upload the file as a .jpg
        const uploadedFile = await storage.upload(jpgFilename, fileBuffer).complete;

        // Update Supabase record to set profile: true
        let dbError;
        if (category) {
            ({ error: dbError } = await supabase
                .from("user")
                .update({ annposter: true })
                .eq("id", id));
        } else {
            ({ error: dbError } = await supabase
                .from("user")
                .update({ poster: true })
                .eq("id", id));
        }
        if (dbError) {
            console.error('Supabase update error:', dbError);
            return NextResponse.json(
                { error: 'File uploaded but failed to update database', details: dbError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'File uploaded and profile updated successfully',
            file: {
                name: uploadedFile.name,
                size: uploadedFile.size,
                url: await uploadedFile.link()
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
