"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPayPeriodDates } from "../utils/dateUtils";
import { db, type PTODay, type ManualBalance } from "../lib/db";

interface PayPeriod {
  date: Date;
  ptoBalance: number;
  ptoUsed: number;
  sickBalance: number;
  sickUsed: number;
}

const PTO_ACCRUAL_RATE = 8.335;
const SICK_ACCRUAL_RATE = 3.334;

export default function PTOTracker() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [ptoDays, setPtoDays] = useState<PTODay[]>([]);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [manualBalances, setManualBalances] = useState<ManualBalance[]>([]);
  const [manualBalanceDate, setManualBalanceDate] = useState<Date | undefined>(
    undefined,
  );
  const [manualPTOBalance, setManualPTOBalance] = useState<string>("");
  const [manualSickBalance, setManualSickBalance] = useState<string>("");
  const [hoursPerDay, setHoursPerDay] = useState<string>("8");
  const [selectedType, setSelectedType] = useState<"PTO" | "Sick">("PTO");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedPtoDays, fetchedManualBalances] = await Promise.all([
          db.getPtoDays(),
          db.getManualBalances(),
        ]);
        setPtoDays(fetchedPtoDays);
        setManualBalances(fetchedManualBalances);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const calculatePayPeriods = () => {
      const payPeriodDates = getPayPeriodDates(2025);
      let ptoBalance = 53.345; // Starting PTO balance
      let sickBalance = 75.33; // Starting Sick balance
      const newPayPeriods: PayPeriod[] = [];

      payPeriodDates.forEach((date, index) => {
        const manualBalance = manualBalances.find(
          (mb) => mb.date.getTime() === date.getTime(),
        );
        if (manualBalance) {
          ptoBalance = manualBalance.ptoBalance;
          sickBalance = manualBalance.sickBalance;
        } else {
          ptoBalance += PTO_ACCRUAL_RATE;
          sickBalance += SICK_ACCRUAL_RATE;
        }

        const previousPayPeriod =
          index > 0 ? payPeriodDates[index - 1] : new Date(2024, 11, 31);
        const ptoUsed = ptoDays
          .filter(
            (day) =>
              day.date >= previousPayPeriod &&
              day.date < date &&
              day.type === "PTO",
          )
          .reduce((sum, day) => sum + day.hours, 0);
        const sickUsed = ptoDays
          .filter(
            (day) =>
              day.date >= previousPayPeriod &&
              day.date < date &&
              day.type === "Sick",
          )
          .reduce((sum, day) => sum + day.hours, 0);

        ptoBalance -= ptoUsed;
        sickBalance -= sickUsed;

        newPayPeriods.push({
          date,
          ptoBalance: Number(ptoBalance.toFixed(2)),
          ptoUsed,
          sickBalance: Number(sickBalance.toFixed(2)),
          sickUsed,
        });
      });

      setPayPeriods(newPayPeriods);
    };
    calculatePayPeriods();
  }, [ptoDays, manualBalances]);

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      const newDates = dates.filter((date) => !isPTODay(date));
      setSelectedDates(newDates);
    } else {
      setSelectedDates([]);
    }
  };

  const handleAddPTO = async () => {
    const hours = Number.parseFloat(hoursPerDay);
    if (isNaN(hours) || hours <= 0) {
      alert("Please enter a valid number of hours greater than 0.");
      return;
    }

    try {
      const newPtoDays = await Promise.all(
        selectedDates.map((date) =>
          db.addPtoDay({
            date: new Date(date),
            hours,
            notes,
            type: selectedType,
          }),
        ),
      );

      setPtoDays((prev) =>
        [...prev, ...newPtoDays].sort(
          (a, b) => a.date.getTime() - b.date.getTime(),
        ),
      );
      setSelectedDates([]);
      setNotes("");
      setHoursPerDay("8");
    } catch (error) {
      console.error("Error adding PTO:", error);
      alert("Failed to add PTO. Please try again.");
    }
  };

  const handleRemovePTO = async (id: number) => {
    try {
      await db.removePtoDay(id);
      setPtoDays((prev) => prev.filter((day) => day.id !== id));
    } catch (error) {
      console.error("Error removing PTO:", error);
      alert("Failed to remove PTO. Please try again.");
    }
  };

  const handleManualBalanceSubmit = async () => {
    if (manualBalanceDate && (manualPTOBalance || manualSickBalance)) {
      try {
        const newBalance = await db.setManualBalance({
          date: manualBalanceDate,
          ptoBalance: Number.parseFloat(manualPTOBalance) || 0,
          sickBalance: Number.parseFloat(manualSickBalance) || 0,
        });
        setManualBalances((prev) => [...prev, newBalance]);
        setManualBalanceDate(undefined);
        setManualPTOBalance("");
        setManualSickBalance("");
      } catch (error) {
        console.error("Error setting manual balance:", error);
        alert("Failed to set manual balance. Please try again.");
      }
    }
  };

  const isPTODay = (day: Date | undefined) => {
    if (!day) return false;
    return ptoDays.some(
      (ptoDay) =>
        ptoDay.date.getFullYear() === day.getFullYear() &&
        ptoDay.date.getMonth() === day.getMonth() &&
        ptoDay.date.getDate() === day.getDate(),
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Select PTO Days</h2>
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={handleDateSelect}
          className="rounded-md border"
          modifiers={{ ptoDay: isPTODay }}
          modifiersClassNames={{
            ptoDay: "bg-blue-200 text-blue-800 hover:bg-blue-300",
          }}
          disabled={isPTODay}
          defaultMonth={selectedDates[0] || undefined}
        />
        <div className="mt-4">
          <div className="flex gap-2 mb-2">
            <Input
              type="number"
              placeholder="Hours per day"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
              className="w-32"
            />
            <Select
              value={selectedType}
              onValueChange={(value: "PTO" | "Sick") => setSelectedType(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PTO">PTO</SelectItem>
                <SelectItem value="Sick">Sick</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Add notes for selected days"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-grow"
            />
          </div>
          <Button onClick={handleAddPTO} disabled={selectedDates.length === 0}>
            Add Time Off
          </Button>
        </div>
        <div className="mt-4 flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Set Manual Balance</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Set Manual Balance</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <Calendar
                    mode="single"
                    selected={manualBalanceDate}
                    onSelect={setManualBalanceDate}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ptoBalance" className="text-right">
                    PTO Balance
                  </Label>
                  <Input
                    id="ptoBalance"
                    type="number"
                    value={manualPTOBalance}
                    onChange={(e) => setManualPTOBalance(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sickBalance" className="text-right">
                    Sick Balance
                  </Label>
                  <Input
                    id="sickBalance"
                    type="number"
                    value={manualSickBalance}
                    onChange={(e) => setManualSickBalance(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <Button onClick={handleManualBalanceSubmit}>Set Balance</Button>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Set Sick Time Balance</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Set Sick Time Balance</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <Calendar
                    mode="single"
                    selected={manualBalanceDate}
                    onSelect={setManualBalanceDate}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sickBalance" className="text-right">
                    Sick Balance
                  </Label>
                  <Input
                    id="sickBalance"
                    type="number"
                    value={manualSickBalance}
                    onChange={(e) => setManualSickBalance(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <Button onClick={() => handleManualBalanceSubmit()}>
                Set Sick Balance
              </Button>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">PTO Days</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ptoDays.map((day) => (
                <TableRow key={day.id}>
                  <TableCell>{day.date.toLocaleDateString()}</TableCell>
                  <TableCell>{day.type}</TableCell>
                  <TableCell>{day.hours}</TableCell>
                  <TableCell>{day.notes}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      onClick={() => handleRemovePTO(day.id!)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">PTO Balance</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pay Period</TableHead>
              <TableHead>PTO Balance</TableHead>
              <TableHead>PTO Used</TableHead>
              <TableHead>Sick Balance</TableHead>
              <TableHead>Sick Used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payPeriods.map((period, index) => (
              <TableRow key={index}>
                <TableCell>{period.date.toLocaleDateString()}</TableCell>
                <TableCell>{period.ptoBalance}</TableCell>
                <TableCell>{period.ptoUsed}</TableCell>
                <TableCell>{period.sickBalance}</TableCell>
                <TableCell>{period.sickUsed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
