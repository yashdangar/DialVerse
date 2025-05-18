"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Phone, Filter, MoreVertical, ArrowUpDown } from "lucide-react"

export default function NumbersListPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // "all" | "active" | "inactive"
  const [sortField, setSortField] = useState("lastCalled")
  const [sortDirection, setSortDirection] = useState("desc") // "asc" | "desc"

  const numbers = [
    {
      id: 1,
      number: "+1 (555) 123-4567",
      label: "Sales Team",
      lastCalled: "2023-06-15",
      callCount: 42,
      status: "active",
    },
    { id: 2, number: "+1 (555) 987-6543", label: "Support", lastCalled: "2023-06-14", callCount: 28, status: "active" },
    {
      id: 3,
      number: "+1 (555) 456-7890",
      label: "Marketing",
      lastCalled: "2023-06-10",
      callCount: 15,
      status: "inactive",
    },
    {
      id: 4,
      number: "+1 (555) 234-5678",
      label: "Customer Service",
      lastCalled: "2023-06-13",
      callCount: 37,
      status: "active",
    },
    {
      id: 5,
      number: "+1 (555) 876-5432",
      label: "Executive",
      lastCalled: "2023-06-08",
      callCount: 9,
      status: "inactive",
    },
    {
      id: 6,
      number: "+1 (555) 345-6789",
      label: "HR Department",
      lastCalled: "2023-06-12",
      callCount: 21,
      status: "active",
    },
    {
      id: 7,
      number: "+1 (555) 654-3210",
      label: "IT Support",
      lastCalled: "2023-06-11",
      callCount: 33,
      status: "active",
    },
    {
      id: 8,
      number: "+1 (555) 789-0123",
      label: "Accounting",
      lastCalled: "2023-06-09",
      callCount: 18,
      status: "inactive",
    },
    {
      id: 9,
      number: "+1 (555) 321-0987",
      label: "Reception",
      lastCalled: "2023-06-14",
      callCount: 45,
      status: "active",
    },
    {
      id: 10,
      number: "+1 (555) 210-9876",
      label: "Shipping",
      lastCalled: "2023-06-07",
      callCount: 12,
      status: "inactive",
    },
  ]

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredNumbers = numbers
    .filter(
      (entry) =>
        (statusFilter === "all" || entry.status === statusFilter) &&
        (entry.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.label.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .sort((a, b) => {
      const fieldA = a[sortField]
      const fieldB = b[sortField]

      if (typeof fieldA === "string" && typeof fieldB === "string") {
        return sortDirection === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA)
      } else if (typeof fieldA === "number" && typeof fieldB === "number") {
        return sortDirection === "asc" ? fieldA - fieldB : fieldB - fieldA
      }

      return 0
    })

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Numbers List</h1>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Phone Numbers</CardTitle>
          <CardDescription>View and manage all phone numbers in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search numbers or labels..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1">
                    <Filter className="h-4 w-4" />
                    {statusFilter === "all"
                      ? "All Status"
                      : statusFilter === "active"
                        ? "Active Only"
                        : "Inactive Only"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active Only</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive Only</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/dialer">
                <Button className="gap-1">
                  <Phone className="h-4 w-4" />
                  Dial
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] cursor-pointer" onClick={() => handleSort("number")}>
                    <div className="flex items-center gap-1">
                      Phone Number
                      {sortField === "number" && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("label")}>
                    <div className="flex items-center gap-1">
                      Label
                      {sortField === "label" && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("lastCalled")}>
                    <div className="flex items-center gap-1">
                      Last Called
                      {sortField === "lastCalled" && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("callCount")}>
                    <div className="flex items-center justify-end gap-1">
                      Call Count
                      {sortField === "callCount" && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === "status" && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No phone numbers found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNumbers.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        <Link href={`/calls/${entry.id}`} className="hover:underline">
                          {entry.number}
                        </Link>
                      </TableCell>
                      <TableCell>{entry.label}</TableCell>
                      <TableCell>{new Date(entry.lastCalled).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{entry.callCount}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "active" ? "default" : "secondary"}>
                          {entry.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Link href={`/calls/${entry.id}`} className="w-full">
                                View Call History
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`/dialer?number=${entry.number}`} className="w-full">
                                Call this Number
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Label</DropdownMenuItem>
                            <DropdownMenuItem>{entry.status === "active" ? "Deactivate" : "Activate"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
