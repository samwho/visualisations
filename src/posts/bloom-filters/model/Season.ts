export type Season = "spring" | "summer" | "autumn" | "winter";
export type Hemisphere = "northern" | "southern";

// IANA tzdb's representative locations south of the equator, plus legacy aliases.
// A timezone is only a hemisphere hint: some span the equator or tropical climates.
// https://data.iana.org/time-zones/tzdb/zone.tab
const southernZones = new Set([
	"Africa/Blantyre",
	"Africa/Brazzaville",
	"Africa/Bujumbura",
	"Africa/Dar_es_Salaam",
	"Africa/Gaborone",
	"Africa/Harare",
	"Africa/Johannesburg",
	"Africa/Kigali",
	"Africa/Kinshasa",
	"Africa/Luanda",
	"Africa/Lubumbashi",
	"Africa/Lusaka",
	"Africa/Maputo",
	"Africa/Maseru",
	"Africa/Mbabane",
	"Africa/Nairobi",
	"Africa/Windhoek",
	"America/Araguaina",
	"America/Asuncion",
	"America/Bahia",
	"America/Belem",
	"America/Buenos_Aires",
	"America/Campo_Grande",
	"America/Catamarca",
	"America/Cordoba",
	"America/Coyhaique",
	"America/Cuiaba",
	"America/Eirunepe",
	"America/Fortaleza",
	"America/Guayaquil",
	"America/Jujuy",
	"America/La_Paz",
	"America/Lima",
	"America/Maceio",
	"America/Manaus",
	"America/Mendoza",
	"America/Montevideo",
	"America/Noronha",
	"America/Porto_Acre",
	"America/Porto_Velho",
	"America/Punta_Arenas",
	"America/Recife",
	"America/Rio_Branco",
	"America/Rosario",
	"America/Santarem",
	"America/Santiago",
	"America/Sao_Paulo",
	"Asia/Dili",
	"Asia/Jakarta",
	"Asia/Jayapura",
	"Asia/Makassar",
	"Asia/Pontianak",
	"Asia/Ujung_Pandang",
	"Atlantic/South_Georgia",
	"Atlantic/St_Helena",
	"Atlantic/Stanley",
	"Indian/Antananarivo",
	"Indian/Chagos",
	"Indian/Christmas",
	"Indian/Cocos",
	"Indian/Comoro",
	"Indian/Kerguelen",
	"Indian/Mahe",
	"Indian/Mauritius",
	"Indian/Mayotte",
	"Indian/Reunion",
	"NZ",
	"NZ-CHAT",
	"Pacific/Apia",
	"Pacific/Auckland",
	"Pacific/Bougainville",
	"Pacific/Chatham",
	"Pacific/Easter",
	"Pacific/Efate",
	"Pacific/Enderbury",
	"Pacific/Fakaofo",
	"Pacific/Fiji",
	"Pacific/Funafuti",
	"Pacific/Galapagos",
	"Pacific/Gambier",
	"Pacific/Guadalcanal",
	"Pacific/Kanton",
	"Pacific/Marquesas",
	"Pacific/Nauru",
	"Pacific/Niue",
	"Pacific/Norfolk",
	"Pacific/Noumea",
	"Pacific/Pago_Pago",
	"Pacific/Pitcairn",
	"Pacific/Port_Moresby",
	"Pacific/Rarotonga",
	"Pacific/Samoa",
	"Pacific/Tahiti",
	"Pacific/Tongatapu",
	"Pacific/Wallis",
	"US/Samoa",
]);

export function hemisphereFor(timeZone: string): Hemisphere {
	return /^(Australia|Antarctica|Brazil|Chile)\//.test(timeZone) ||
		timeZone.startsWith("America/Argentina/") ||
		southernZones.has(timeZone)
		? "southern"
		: "northern";
}

export function seasonFor(
	month: number,
	timeZone: string,
	hemisphere = hemisphereFor(timeZone),
): Season {
	// Month is Date.getMonth()'s zero-based local month. Unknown/UTC zones default north.
	const seasons = ["winter", "spring", "summer", "autumn"] as const;
	const index = Math.floor(
		((month + 1 + (hemisphere === "southern" ? 6 : 0)) % 12) / 3,
	);
	return seasons[index]!;
}

export function seasonBlend(
	date: Date,
	timeZone: string,
	hemisphere = hemisphereFor(timeZone),
) {
	const month = date.getMonth();
	const year = date.getFullYear();
	const season = seasonFor(month, timeZone, hemisphere);
	const startMonth = Math.floor((month + 1) / 3) * 3 - 1;
	// Compare civil days in UTC so daylight-saving changes don't alter the blend.
	const day = Date.UTC(year, month, date.getDate());
	const sinceStart = (day - Date.UTC(year, startMonth, 1)) / 86400000;
	const untilEnd = (Date.UTC(year, startMonth + 3, 1) - day) / 86400000;
	const halfWindow = 14;
	let from = season;
	let to = season;
	let progress = 0;
	if (sinceStart < halfWindow) {
		from = seasonFor((startMonth + 11) % 12, timeZone, hemisphere);
		progress = (sinceStart + halfWindow) / (halfWindow * 2);
	} else if (untilEnd <= halfWindow) {
		to = seasonFor((startMonth + 3) % 12, timeZone, hemisphere);
		progress = (halfWindow - untilEnd) / (halfWindow * 2);
	}
	return { from, to, amount: progress * progress * (3 - 2 * progress) };
}
