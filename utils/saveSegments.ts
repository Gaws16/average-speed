import { LatLng } from "react-native-maps";
import { segments as baseSegments } from "../constants/segments";
import { supabase } from "./supabase";

export async function saveSegmentToDb(
  s: (typeof baseSegments)[number],
  pathLatLng: LatLng[]
) {
  const { error } = await supabase.from("road_segments").insert({
    id: `${s.road}:${s.name}`,
    road: s.road,
    name: s.name,
    start_point: `SRID=4326;POINT(${s.start.longitude} ${s.start.latitude})`,
    finish_point: `SRID=4326;POINT(${s.finish.longitude} ${s.finish.latitude})`,
    path: pathLatLng, // Supabase will store this as JSONB
  });

  if (error) {
    console.error(`Error inserting ${s.road}:${s.name}`, error);
  } else {
    console.log(`Inserted ${s.road}:${s.name}`);
  }
}
