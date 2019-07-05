export interface DirectoryInformation {
  Name: string;
  Id: string;
  Location: string;
  ContentLocation: string;
  ChildrenLocation: string;
  ExportLocation: string;
  ImportLocation: string;
  Directory: boolean;
  Attributes: DirectoryInformationAttributes;
  Workspaces: any[];
  SapBackPack: DirectoryInformationSapBackPack;
  Parents: Parent[];
  Children: Child[];
}

export interface DirectoryInformationAttributes {
  ReadOnly: boolean;
  Executable: boolean;
  Hidden: boolean;
  Archive: boolean;
  SymbolicLink: boolean;
  SapBackPack: PurpleSapBackPack;
}

export interface PurpleSapBackPack {
  Structural: boolean;
}

export interface Child {
  Name: string;
  Directory: boolean;
  Attributes: ChildAttributes;
  Location: string;
  RunLocation: string;
  SapBackPack: string;
}

export interface ChildAttributes {
  SapBackPack: FluffySapBackPack;
}

export interface FluffySapBackPack {
  Activated: boolean;
  IsDeletion: boolean;
}

export interface Parent {
  Name: string;
  ChildrenLocation: string;
  Location: string;
  ExportLocation: string;
}

export interface DirectoryInformationSapBackPack {
  SrcSystem: string;
  Responsible: string;
}


export interface FileMetadata {
  Name: string;
  Location: string;
  RunLocation: string;
  Directory: boolean;
  LocalTimeStamp: number;
  ContentType: string;
  Attributes: Attributes;
  ETag: string;
  Parents: Parent[];
  SapBackPack: FileMetadataSapBackPack;
}

export interface Attributes {
  SapBackPack: AttributesSapBackPack;
  ReadOnly: boolean;
  Executable: boolean;
  Hidden: boolean;
  Archive: boolean;
  SymbolicLink: boolean;
}

export interface AttributesSapBackPack {
  Activated: boolean;
  IsDeletion: boolean;
}

export interface Parent {
  Name: string;
  ChildrenLocation: string;
  Location: string;
  ExportLocation: string;
}

export interface FileMetadataSapBackPack {
  Version: number;
  Type: number;
  ActivatedAt: number;
  ActivatedBy: string;
  ObjectStatus: string;
  IsDeletion: boolean;
}
