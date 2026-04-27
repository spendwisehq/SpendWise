// Soft radial glow blobs behind login/signup.
import React from 'react';
import { View } from 'react-native';

export default function AuthGlows() {
  return (
    <>
      <View pointerEvents="none" style={{
        position:'absolute', left:-110, top:-40,
        width:500, height:500, borderRadius:250,
        backgroundColor:'rgba(38,163,122,0.14)',
      }}/>
      <View pointerEvents="none" style={{
        position:'absolute', left:-40, top:480,
        width:400, height:400, borderRadius:200,
        backgroundColor:'rgba(155,127,237,0.12)',
      }}/>
    </>
  );
}
