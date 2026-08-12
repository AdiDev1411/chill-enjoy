import { NextResponse } from "next/server";

const R2_BASE_URL =
  "https://pub-982b4f76c1e449eb89e22bc0a3656068.r2.dev";

const songs = [
  {
    name: "Agar Tum Saath Ho",
    file: "AGAR TUM SAATH HO.mp3",
  },
  {
    name: "Dil Diyan Gallan",
    file: "Dil Diyan Gallan.mp3",
  },
  {
    name: "Ghungroo",
    file: "Ghungroo.mp3",
  },
  {
    name: "Kalank",
    file: "Kalank.mp3",
  },
  {
    name: "Sanam Re",
    file: "SANAM RE.mp3",
  },
  {
    name: "Soniyo",
    file: "Soniyo.mp3",
  },
  {
    name: "Tere Bin",
    file: "Tere Bin.mp3",
  },
  {
    name: "Tum Mile",
    file: "Tum Mile.mp3",
  },
  {
    name: "Vaaste",
    file: "Vaaste.mp3",
  }
];

export async function GET() {
  const result = songs.map((song) => ({
    name: song.name,
    file: song.file,
    url: `${R2_BASE_URL}/${encodeURIComponent(song.file)}`,
  }));

  return NextResponse.json(result);
}