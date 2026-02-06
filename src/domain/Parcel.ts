export interface PackageDimensions {
  lengthInches: number;
  widthInches: number;
  heightInches: number;
}

export interface Parcel {
  weightLbs: number;
  dimensions: PackageDimensions;
}

/** Alias for API compatibility (request.package). */
export type Package = Parcel;
