import {fetchWithAuth} from "../../../utils/api.ts";
import {ILocale} from "../../../models/locale.model.ts";

export const fetchLocale = async (id: string): Promise<ILocale> => {
  const response = await fetchWithAuth(`/locales/id/${id}`);
  if (!response.ok) {
    throw new Error('Network response was not ok: Status ' + response.statusText.toString() + ', ' + response.status.toString() + ', ' + response.url.toString());
  }
  return response.json();
};