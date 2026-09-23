import React from 'react';

const CHARGING_HUB_MAP_URL =
  'https://www.google.com/maps/d/embed?mid=1EyUYSeqg-jH4dTRtjCnUSfVRXVF7KK8&ehbc=2E312F';

export default function ChargingHubMap({ height = 480, title = 'Charging Hub Map' }) {
  return (
    <div
      style={{
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        border: '1px solid #e4e7ef',
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,.07)',
      }}
      aria-label={title}
    >
      <iframe
        src={CHARGING_HUB_MAP_URL}
        title={title}
        width="100%"
        height={height}
        style={{ display: 'block', width: '100%', minHeight: 420, border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
