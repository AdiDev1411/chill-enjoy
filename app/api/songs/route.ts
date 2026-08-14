import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  type _Object,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const MUSIC_PREFIX = "music/";

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
];

type Song = {
  name: string;
  file: string;
  url: string;
};

type Theme = {
  id: string;
  name: string;
  folder: string;
  songs: Song[];
};

function getSongName(file: string) {
  return (
    file
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "")
      .replace(/_/g, " ")
      .trim() || "Unknown Song"
  );
}

function getThemeName(folder: string) {
  return folder
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function GET() {
  try {
    let allObjects: _Object[] = [];
    let continuationToken: string | undefined;

    // Get all objects from R2
    do {
      const response: ListObjectsV2CommandOutput =
        await client.send(
          new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: MUSIC_PREFIX,
            ContinuationToken: continuationToken,
          })
        );

      allObjects = [
        ...allObjects,
        ...(response.Contents ?? []),
      ];

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    // Find audio files
    const audioObjects = allObjects.filter((object) => {
      const key = object.Key?.toLowerCase() ?? "";

      return AUDIO_EXTENSIONS.some((extension) =>
        key.endsWith(extension)
      );
    });

    // Group songs by R2 folder
    const themeMap: Record<string, Song[]> = {};

    audioObjects.forEach((object) => {
      const file = object.Key;

      if (!file) return;

      /*
        Expected R2 structure:

        music/party/song.mp3
        music/gym/song.mp3
        music/lofi/song.mp3
        music/romantic/song.mp3
      */

      const parts = file.split("/");

      // Must contain:
      // music / folder / song
      if (parts.length < 3) return;

      const folder = parts[1];

      if (!folder) return;

      if (!themeMap[folder]) {
        themeMap[folder] = [];
      }

      const name = getSongName(file);

      const baseUrl =
        process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

      if (!baseUrl) {
        throw new Error("R2_PUBLIC_URL is not configured");
      }

      const url = `${baseUrl}/${file
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;

      themeMap[folder].push({
        name,
        file,
        url,
      });
    });

    // Convert folder map into themes
    const themes: Theme[] = Object.entries(themeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([folder, songs]) => ({
        id: folder,
        name: getThemeName(folder),
        folder,
        songs: songs.sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));

    return NextResponse.json({
      themes,
    });
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