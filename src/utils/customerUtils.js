//customerUtils.js
import porfiMapDefault from "../../assets/porfi_01.png";
import porfiMapFinal from "../../assets/porfi_storage_final.png";
import katoopsiMapDefault from "../../assets/katoopsi_exo.png";
import katoopsiMapInside from "../../assets/katoopsi_inside.png";

const MAP_IMAGES = {
  "porfi_01.png": porfiMapDefault,
  "porfi_storage_final.png": porfiMapFinal,
  "katoopsi_exo.png": katoopsiMapDefault,
  "katoopsi_inside.png": katoopsiMapInside,
};

export function processCustomerData(customer) {
  if (!customer) return customer;

  // Just ensure maps is an array with proper structure
  const processedMaps = (customer.maps || []).map((map, index) => ({
    ...map,
    mapId: map.mapId || `map_${index + 1}`,
    // Keep the image filename as-is
    image: map.image || "",
    stations: Array.isArray(map.stations) ? map.stations : [],
  }));

  return {
    ...customer,
    maps: processedMaps,
  };
}