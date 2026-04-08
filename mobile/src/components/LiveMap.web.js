import React from 'react';
import { View, Text } from 'react-native';

export default function LiveMap({ driverPos, style }) {
  return (
    <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }]}>
      <Text style={{ fontSize: 28, marginBottom: 8 }}>🗺️</Text>
      <Text style={{ color: '#64748b', fontSize: 13 }}>Map is available on mobile devices</Text>
    </View>
  );
}
