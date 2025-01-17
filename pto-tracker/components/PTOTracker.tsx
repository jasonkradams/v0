'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getPayPeriodDates } from '../utils/dateUtils'

interface PTODay {
  date: Date
  hours: number
  notes: string
}

interface PayPeriod {
  date: Date
  ptoBalance: number
  ptoUsed: number
}

interface ManualBalance {
  date: Date
  balance: number
}

const ACCRUAL_RATE = 8.335
const HOURS_PER_DAY = 8

export default function PTOTracker() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [ptoDays, setPtoDays] = useState<PTODay[]>([])
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([])
  const [notes, setNotes] = useState<string>('')
  const [manualBalances, setManualBalances] = useState<ManualBalance[]>([])
  const [manualBalanceDate, setManualBalanceDate] = useState<Date | undefined>(undefined)
  const [manualBalanceAmount, setManualBalanceAmount] = useState<string>('')

  useEffect(() => {
    calculatePayPeriods()
  }, [ptoDays, manualBalances])

  const calculatePayPeriods = () => {
    const payPeriodDates = getPayPeriodDates(2025)
    let ptoBalance = 53.345 // Starting balance (assuming 6.4014 months of accrual)
    const newPayPeriods: PayPeriod[] = []

    payPeriodDates.forEach((date, index) => {
      const manualBalance = manualBalances.find(mb => mb.date.getTime() === date.getTime())
      if (manualBalance) {
        ptoBalance = manualBalance.balance
      } else {
        ptoBalance += ACCRUAL_RATE
      }

      const previousPayPeriod = index > 0 ? payPeriodDates[index - 1] : new Date(2024, 11, 31)
      const ptoUsed = ptoDays
        .filter(day => day.date >= previousPayPeriod && day.date < date)
        .reduce((sum, day) => sum + day.hours, 0)
      ptoBalance -= ptoUsed

      newPayPeriods.push({
        date,
        ptoBalance: Number(ptoBalance.toFixed(2)),
        ptoUsed
      })
    })

    setPayPeriods(newPayPeriods)
  }

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setSelectedDates(dates)
    }
  }

  const handleAddPTO = () => {
    const newPtoDays = selectedDates.map(date => ({
      date: new Date(date),
      hours: HOURS_PER_DAY,
      notes
    }))
    setPtoDays(prev => [...prev, ...newPtoDays])
    setSelectedDates([])
    setNotes('')
  }

  const handleRemovePTO = (index: number) => {
    setPtoDays(prev => prev.filter((_, i) => i !== index))
  }

  const handleManualBalanceSubmit = () => {
    if (manualBalanceDate && manualBalanceAmount) {
      setManualBalances(prev => [
        ...prev.filter(mb => mb.date.getTime() !== manualBalanceDate.getTime()),
        { date: manualBalanceDate, balance: parseFloat(manualBalanceAmount) }
      ])
      setManualBalanceDate(undefined)
      setManualBalanceAmount('')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Select PTO Days</h2>
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={handleDateSelect}
          className="rounded-md border"
        />
        <div className="mt-4">
          <Input
            placeholder="Add notes for selected days"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mb-2"
          />
          <Button onClick={handleAddPTO} disabled={selectedDates.length === 0}>
            Add PTO
          </Button>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Manually Set PTO Balance</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Set Manual Balance</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Set Manual PTO Balance</DialogTitle>
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
                  <Label htmlFor="balance" className="text-right">
                    Balance
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    value={manualBalanceAmount}
                    onChange={(e) => setManualBalanceAmount(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <Button onClick={handleManualBalanceSubmit}>Set Balance</Button>
            </DialogContent>
          </Dialog>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {payPeriods.map((period, index) => (
              <TableRow key={index}>
                <TableCell>{period.date.toLocaleDateString()}</TableCell>
                <TableCell>{period.ptoBalance}</TableCell>
                <TableCell>{period.ptoUsed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="md:col-span-2">
        <h2 className="text-xl font-semibold mb-2">PTO Days</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ptoDays.map((day, index) => (
              <TableRow key={index}>
                <TableCell>{day.date.toLocaleDateString()}</TableCell>
                <TableCell>{day.hours}</TableCell>
                <TableCell>{day.notes}</TableCell>
                <TableCell>
                  <Button variant="destructive" onClick={() => handleRemovePTO(index)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
