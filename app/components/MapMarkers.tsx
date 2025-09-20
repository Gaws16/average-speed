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
      {segments.map((s, index) => {
        const startCoord = s.path && s.path.length >= 1 ? s.path[0] : s.start;
        const endCoord =
          s.path && s.path.length >= 1 ? s.path[s.path.length - 1] : s.finish;
        return (
          <React.Fragment key={`${s.road}-${s.name}-${index}`}>
            <Marker
              key={`${s.road}-${s.name}-start-${index}`}
              coordinate={{
                latitude: startCoord.latitude,
                longitude: startCoord.longitude,
              }}
              title={`${s.road}: Start`}
              description={s.name}
              pinColor="red"
              tracksViewChanges={false}
            />
            <Marker
              key={`${s.road}-${s.name}-finish-${index}`}
              coordinate={{
                latitude: endCoord.latitude,
                longitude: endCoord.longitude,
              }}
              title={`${s.road}: Finish`}
              description={s.name}
              pinColor="red"
              tracksViewChanges={false}
            />
          </React.Fragment>
        );
      })}

      {activeSegment && (
        <>
          {(() => {
            const startCoord =
              activeSegment.path && activeSegment.path.length >= 1
                ? activeSegment.path[0]
                : activeSegment.start;
            const endCoord =
              activeSegment.path && activeSegment.path.length >= 1
                ? activeSegment.path[activeSegment.path.length - 1]
                : activeSegment.finish;
            return (
              <>
                <Marker
                  coordinate={{
                    latitude: startCoord.latitude,
                    longitude: startCoord.longitude,
                  }}
                  title={`${activeSegment.road}: Start`}
                  description={activeSegment.name}
                  pinColor="red"
                />
                <Marker
                  coordinate={{
                    latitude: endCoord.latitude,
                    longitude: endCoord.longitude,
                  }}
                  title={`${activeSegment.road}: Finish`}
                  description={activeSegment.name}
                  pinColor="red"
                />
              </>
            );
          })()}
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
