import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the api module so healthStore uses localStorage path (no API_BASE)
vi.mock("./api", () => ({
  API_BASE: "",
  apiFetch: vi.fn(),
  getStoredUser: () => null,
}));

import {
  getRecords,
  saveRecord,
  getWearable,
  saveWearable,
  getProfile,
  saveProfile,
  exportAll,
  deleteAllData,
} from "./healthStore";

describe("healthStore (localStorage mode)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getRecords", () => {
    it("returns empty array when no data", async () => {
      const records = await getRecords();
      expect(records).toEqual([]);
    });

    it("returns parsed records from localStorage", async () => {
      const data = [{ date: "2026-07-23", sleep_hours: 7 }];
      localStorage.setItem("aix_records_local-demo", JSON.stringify(data));
      const records = await getRecords();
      expect(records).toEqual(data);
    });
  });

  describe("saveRecord", () => {
    it("saves a new record and retrieves it", async () => {
      const rec = { date: "2026-07-23", sleep_hours: 8, training_load: 60 };
      const result = await saveRecord(rec);
      expect(result.date).toBe("2026-07-23");
      expect(result.sleep_hours).toBe(8);

      const records = await getRecords();
      expect(records).toHaveLength(1);
      expect(records[0].date).toBe("2026-07-23");
    });

    it("merges record with same date", async () => {
      await saveRecord({ date: "2026-07-23", sleep_hours: 7 });
      await saveRecord({ date: "2026-07-23", training_load: 80 });

      const records = await getRecords();
      expect(records).toHaveLength(1);
      expect(records[0].sleep_hours).toBe(7);
      expect(records[0].training_load).toBe(80);
    });
  });

  describe("getWearable", () => {
    it("returns empty array when no data", async () => {
      const data = await getWearable();
      expect(data).toEqual([]);
    });
  });

  describe("saveWearable", () => {
    it("saves and retrieves wearable data", async () => {
      const rec = { date: "2026-07-23", source: "manual", resting_hr: 62 };
      const result = await saveWearable(rec);
      expect(result.date).toBe("2026-07-23");
      expect(result.resting_hr).toBe(62);
      expect(result.updated_at).toBeDefined();

      const data = await getWearable();
      expect(data).toHaveLength(1);
      expect(data[0].resting_hr).toBe(62);
    });

    it("merges wearable entry with same date and source", async () => {
      await saveWearable({ date: "2026-07-23", source: "ble", resting_hr: 60 });
      await saveWearable({ date: "2026-07-23", source: "ble", steps: 8000 });

      const data = await getWearable();
      expect(data).toHaveLength(1);
      expect(data[0].resting_hr).toBe(60);
      expect(data[0].steps).toBe(8000);
    });
  });

  describe("getProfile / saveProfile", () => {
    it("returns null when no profile", async () => {
      const profile = await getProfile();
      expect(profile).toBeNull();
    });

    it("saves and retrieves profile", async () => {
      const p = { name: "Test User", age: 30, height: 175 };
      await saveProfile(p);
      const profile = await getProfile();
      expect(profile).toEqual(p);
    });
  });

  describe("exportAll", () => {
    it("returns correct schema", async () => {
      await saveProfile({ name: "Test" });
      await saveRecord({ date: "2026-07-23", sleep_hours: 7 });
      await saveWearable({ date: "2026-07-23", source: "manual", steps: 5000 });

      const exported = await exportAll();
      expect(exported.schema_version).toBe(2);
      expect(exported.exported_at).toBeDefined();
      expect(exported.profile).toEqual({ name: "Test" });
      expect(exported.records).toHaveLength(1);
      expect(exported.wearable).toHaveLength(1);
    });
  });

  describe("deleteAllData", () => {
    it("clears all stored data", async () => {
      await saveProfile({ name: "Test" });
      await saveRecord({ date: "2026-07-23", sleep_hours: 7 });
      await saveWearable({ date: "2026-07-23", source: "manual", steps: 5000 });

      const result = await deleteAllData();
      expect(result).toEqual({ ok: true });

      const profile = await getProfile();
      const records = await getRecords();
      const wearable = await getWearable();
      expect(profile).toBeNull();
      expect(records).toEqual([]);
      expect(wearable).toEqual([]);
    });
  });
});
