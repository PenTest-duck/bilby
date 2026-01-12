/**
 * Type declarations for modules missing types
 */

declare module 'react-native/Libraries/Image/AssetSourceResolver';
declare module '@react-native/assets-registry/registry' {
  export interface PackagerAsset {
    __packager_asset: boolean;
    fileSystemLocation: string;
    httpServerLocation: string;
    width?: number;
    height?: number;
    scales: number[];
    hash: string;
    name: string;
    type: string;
  }
  export function getAssetByID(assetId: number): PackagerAsset;
}
