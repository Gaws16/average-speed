import React from "react";

type LatLng = { latitude: number; longitude: number };

export type SegmentLite = {
  road: string;
  name: string;
  start: LatLng;
  finish: LatLng;
  path?: LatLng[];
};

type Props = {
  Polyline: any;
  segments: SegmentLite[];
};

export default function MapPolylines({ Polyline, segments }: Props) {
  return (
    <>
      {segments.map((s, index) => (
        <Polyline
          key={`${s.road}-${s.name}-line-${index}`}
          coordinates={
            s.path && s.path.length >= 2 ? s.path : [s.start, s.finish]
          }
          strokeColor="#d32f2f"
          strokeWidth={3}
        />
      ))}
    </>
  );
}
