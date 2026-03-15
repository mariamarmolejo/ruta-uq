"use client";

import { useEffect, useState } from "react";
import type { VehicleSummary } from "@/types";
import { vehiclesService } from "@/services/vehicles.service";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getErrorMessage } from "@/lib/utils";
import VehicleForm, { vehicleToFormValues } from "@/components/driver/VehicleForm";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Modal from "@/components/ui/Modal";

type ModalMode = { type: "create" } | { type: "edit"; vehicle: VehicleSummary };

export default function VehiclesPage() {
  const loading = useRequireRole(["DRIVER", "ADMIN"]);

  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setFetching(true);
    setError(null);
    try {
      setVehicles(await vehiclesService.getAll());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchVehicles();
  }, [loading]);

  const handleCreate = async (data: Parameters<typeof vehiclesService.create>[0]) => {
    await vehiclesService.create(data);
    setModal(null);
    await fetchVehicles();
  };

  const handleEdit = async (
    id: string,
    data: Parameters<typeof vehiclesService.update>[1]
  ) => {
    await vehiclesService.update(id, data);
    setModal(null);
    await fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this vehicle? Trips using it may be affected.")) return;
    setDeletingId(id);
    try {
      await vehiclesService.remove(id);
      await fetchVehicles();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || fetching) return <Loader fullPage />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">My Vehicles</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage the vehicles you offer for trips.
          </p>
        </div>
        <Button size="sm" onClick={() => setModal({ type: "create" })}>
          Add vehicle
        </Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchVehicles} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          description="Add your first vehicle to start publishing trips."
          action={
            <Button size="sm" onClick={() => setModal({ type: "create" })}>
              Add vehicle
            </Button>
          }
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-neutral-900">
                    {v.brand} {v.model}
                  </p>
                  <p className="text-sm text-neutral-500">{v.year} · {v.color}</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                  {v.plate}
                </span>
              </div>
              <p className="mb-4 text-sm text-neutral-500">
                {v.seats} seats
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModal({ type: "edit", vehicle: v })}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deletingId === v.id}
                  onClick={() => handleDelete(v.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={modal?.type === "create"}
        onClose={() => setModal(null)}
        title="Add vehicle"
      >
        <VehicleForm onSubmit={handleCreate} submitLabel="Add vehicle" />
      </Modal>

      {/* Edit modal */}
      {modal?.type === "edit" && (
        <Modal
          open
          onClose={() => setModal(null)}
          title="Edit vehicle"
        >
          <VehicleForm
            defaultValues={vehicleToFormValues(modal.vehicle)}
            onSubmit={(data) => handleEdit(modal.vehicle.id, data)}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </div>
  );
}
