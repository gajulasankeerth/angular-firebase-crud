export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  streetAddress: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lotNumber?: string;
  subdivision?: string;
  contractorBuilder?: string;
  projectTypes?: string[];
  colorMaterial?: string;
  sinkType?: string;
  faucetType?: string;
  edgeStyle?: string;
  backsplashHeight?: string;
  stoveType?: string;
  status?: string;
  createdAt?: Date | any;
  areas?: Area[];
}
/* ---------------------------------- */
/* Area model                         */
/* ---------------------------------- */
export interface Area {
  areaName?: string;
  colorMaterial?: string;
  edgeStyle?: string;
  sinkType?: string;
  backsplashHeight?: string;
  faucetType?: string;
  stoveType?: string;
}
