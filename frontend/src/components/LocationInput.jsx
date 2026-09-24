import { MapPinIcon } from "@heroicons/react/24/outline";

/** Incident location shown in the alert email, WhatsApp message and PDF. */
export default function LocationInput({ value, onChange, disabled }) {
  return (
    <div>
      <label htmlFor="incident-location" className="label">Incident location <span className="text-slate-500 font-normal">(optional)</span></label>
      <div className="relative">
        <MapPinIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="incident-location"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={255}
          placeholder="e.g. Motorway M-2, near Kallar Kahar"
          className="input pl-10 disabled:opacity-60"
        />
      </div>
    </div>
  );
}
