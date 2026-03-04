/**
* Ce fichier a été @generated avec pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	Actions = "actions",
	Brouillons = "brouillons",
	Produits = "produits",
	Projets = "projets",
	Users = "users",
}

// Alias de types pour une meilleure lisibilité
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// Champs système
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Types d'enregistrements pour chaque collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export enum ActionsTypeActionOptions {
	"Événement solidaire" = "Événement solidaire",
	"Intervention en milieu scolaire" = "Intervention en milieu scolaire",
	"Soutien médical" = "Soutien médical",
	"Action ponctuelle" = "Action ponctuelle",
	"Atelier éducatif et culturel" = "Atelier éducatif et culturel",
	"Animations" = "Animations",
	"Rencontre intergénération" = "Rencontre intergénération",
}

export enum ActionsTypeDeChiffreOptions {
	"dépenses" = "dépenses",
	"récoltes" = "récoltes",
}
export type ActionsRecord = {
	adresse_lieu?: string
	beneficiaire?: string
	chiffre?: number
	created: IsoAutoDateString
	date_debut?: IsoDateString
	date_fin?: IsoDateString
	description_hero?: string
	description_photo_partie_1?: string
	description_photo_partie_2?: string
	description_photo_partie_3?: string
	description_remerciements?: string
	galerie_photos?: FileNameString[]
	hero?: FileNameString
	id: string
	lien_lieu?: string
	nom_lieu?: string
	photo_partie_1?: FileNameString
	photo_partie_2?: FileNameString
	photo_partie_3?: FileNameString
	sous_titre?: string
	texte_partie_1?: string
	texte_partie_2?: string
	texte_partie_3?: string
	titre?: string
	titre_partie_1?: string
	titre_partie_2?: string
	titre_partie_3?: string
	titre_remerciements?: string
	type_action?: ActionsTypeActionOptions[]
	type_de_chiffre?: ActionsTypeDeChiffreOptions
	updated: IsoAutoDateString
}

export enum BrouillonsTypeDeChiffreOptions {
	"dépenses" = "dépenses",
	"récoltes" = "récoltes",
}

export enum BrouillonsTypeOptions {
	"action" = "action",
	"produit" = "produit",
	"projet" = "projet",
}
export type BrouillonsRecord = {
	adresse_lieu?: string
	beneficiaire?: string
	chiffre?: number
	created: IsoAutoDateString
	date_debut?: IsoDateString
	date_fin?: IsoDateString
	description_hero?: string
	description_photo_partie_1?: string
	description_photo_partie_2?: string
	description_photo_partie_3?: string
	description_remerciements?: string
	galerie_photos?: FileNameString[]
	hero?: FileNameString
	id: string
	lien_lieu?: string
	nom_lieu?: string
	photo_partie_1?: FileNameString
	photo_partie_2?: FileNameString
	photo_partie_3?: FileNameString
	sous_titre?: string
	texte_partie_1?: string
	texte_partie_2?: string
	texte_partie_3?: string
	titre?: string
	titre_partie_1?: string
	titre_partie_2?: string
	titre_partie_3?: string
	titre_remerciements?: string
	type?: BrouillonsTypeOptions
	type_de_chiffre?: BrouillonsTypeDeChiffreOptions
	updated: IsoAutoDateString
}

export type ProduitsRecord = {
	created: IsoAutoDateString
	id: string
	titre?: string
	updated: IsoAutoDateString
}

export type ProjetsRecord = {
	created: IsoAutoDateString
	id: string
	titre?: string
	updated: IsoAutoDateString
}

export type UsersRecord = {
	administrateur?: boolean
	avatar?: FileNameString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	rejected?: boolean
	rejectedBy?: RecordIdString
	rejectionDate?: IsoDateString
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

// Les types de réponse incluent les champs système et correspondent aux réponses de l'API PocketBase
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type ActionsResponse<Texpand = unknown> = Required<ActionsRecord> & BaseSystemFields<Texpand>
export type BrouillonsResponse<Texpand = unknown> = Required<BrouillonsRecord> & BaseSystemFields<Texpand>
export type ProduitsResponse<Texpand = unknown> = Required<ProduitsRecord> & BaseSystemFields<Texpand>
export type ProjetsResponse<Texpand = unknown> = Required<ProjetsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types contenant tous les enregistrements et toutes les réponses, utiles pour créer des fonctions d'aide de typage

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	actions: ActionsRecord
	brouillons: BrouillonsRecord
	produits: ProduitsRecord
	projets: ProjetsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	actions: ActionsResponse
	brouillons: BrouillonsResponse
	produits: ProduitsResponse
	projets: ProjetsResponse
	users: UsersResponse
}

// Types utilitaires pour les opérations de création/mise à jour

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Exclure les champs AutoDate
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convertir FileNameString en File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Type de création pour les collections Auth
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Type de création pour les collections de base
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Type de mise à jour pour les collections Auth
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Type de mise à jour pour les collections de base
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Obtenir le type de création correct pour n'importe quelle collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Obtenir le type de mise à jour correct pour n'importe quelle collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type à utiliser avec une instance PocketBase typée explicitement
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase

