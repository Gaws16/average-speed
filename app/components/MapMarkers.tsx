import React from "react";

type LatLng = { latitude: number; longitude: number };

export type SegmentLite = {
  road: string;
  name: string;
  start: LatLng;
  finish: LatLng;
};

type Props = {
  Marker: any;
  segments: SegmentLite[];
  activeSegment: SegmentLite | null;
  startPoint: LatLng & { name?: string };
  finishPoint: LatLng & { name?: string };
};

export default function MapMarkers({
  Marker,
  segments,
  activeSegment,
  startPoint,
  finishPoint,
}: Props) {
  return (
    <>
      {segments.map((s, index) => (
        <React.Fragment key={`${s.road}-${s.name}-${index}`}>
          <Marker
            key={`${s.road}-${s.name}-start-${index}`}
            coordinate={{
              latitude: s.start.latitude,
              longitude: s.start.longitude,
            }}
            title={`${s.road}: Start`}
            description={s.name}
            pinColor="red"
            tracksViewChanges={false}
          />
          <Marker
            key={`${s.road}-${s.name}-finish-${index}`}
            coordinate={{
              latitude: s.finish.latitude,
              longitude: s.finish.longitude,
            }}
            title={`${s.road}: Finish`}
            description={s.name}
            pinColor="red"
            tracksViewChanges={false}
          />
        </React.Fragment>
      ))}

      {activeSegment && (
        <>
          <Marker
            coordinate={{
              latitude: activeSegment.start.latitude,
              longitude: activeSegment.start.longitude,
            }}
            title={`${activeSegment.road}: Start`}
            description={activeSegment.name}
            pinColor="red"
          />
          <Marker
            coordinate={{
              latitude: activeSegment.finish.latitude,
              longitude: activeSegment.finish.longitude,
            }}
            title={`${activeSegment.road}: Finish`}
            description={activeSegment.name}
            pinColor="red"
          />
        </>
      )}

      <Marker
        coordinate={{
          latitude: startPoint.latitude,
          longitude: startPoint.longitude,
        }}
        title={startPoint.name}
        description="Start checkpoint"
        pinColor="red"
      />
      <Marker
        coordinate={{
          latitude: finishPoint.latitude,
          longitude: finishPoint.longitude,
        }}
        title={finishPoint.name}
        description="Finish checkpoint"
        pinColor="red"
      />
    </>
  );
}
