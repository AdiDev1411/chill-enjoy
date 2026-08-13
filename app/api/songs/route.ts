import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
      })
    );

    const objects = response.Contents ?? [];

    const songs = objects
      .filter((object) => {
        const key = object.Key?.toLowerCase() ?? "";

        return (
          key.endsWith(".mp3") ||
          key.endsWith(".m4a") ||
          key.endsWith(".wav") ||
          key.endsWith(".ogg")
        );
      })
      .map((object) => {
        const file = object.Key!;

        const name = file
          .split("/")
          .pop()!
          .replace(/\.[^/.]+$/, "")
          .replace(/_/g, " ")
          .trim();

        return {
          name,
          file,
          url: `${process.env.R2_PUBLIC_URL}/${file
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
        };
      });

    return NextResponse.json(songs);
  } catch (error) {
    console.error("R2 error:", error);

    return NextResponse.json(
      {
        error: "Unable to load songs from R2",
      },
      {
        status: 500,
      }
    );
  }
}