import { MapPin } from "lucide-react";

import { InfoGrid, InfoItem } from "@/components/shared/InfoGrid";
import {
  ADDRESS_FIELD_LABELS,
  secondAddressOf,
  type Address,
} from "@/lib/address";

type TutorAddressColumns = Address & Parameters<typeof secondAddressOf>[0];

function AddressGrid({ address }: { address: Address }) {
  return (
    <InfoGrid columns={3}>
      <InfoItem
        label={ADDRESS_FIELD_LABELS.country}
        value={address.country}
        icon={<MapPin />}
      />
      <InfoItem label={ADDRESS_FIELD_LABELS.city} value={address.city} />
      <InfoItem label={ADDRESS_FIELD_LABELS.subcity} value={address.subcity} />
      <InfoItem label={ADDRESS_FIELD_LABELS.woreda} value={address.woreda} />
      <InfoItem
        label={ADDRESS_FIELD_LABELS.exactPlace}
        value={address.exactPlace}
      />
    </InfoGrid>
  );
}

/** A tutor's address, followed by their second address when they gave one. */
export function AddressInfo({ tutor }: { tutor: TutorAddressColumns }) {
  const secondAddress = secondAddressOf(tutor);

  if (!secondAddress) {
    return <AddressGrid address={tutor} />;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Address 1</h3>
        <AddressGrid address={tutor} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Address 2</h3>
        <AddressGrid address={secondAddress} />
      </div>
    </div>
  );
}
