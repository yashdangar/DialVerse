"use client"

import { useState, useEffect } from "react"
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
  const [numbers, setNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNumbers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/phone-numbers')
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers')
      }
      const data = await response.json()
      setNumbers(data)
    } catch (err) {
      console.error('Error fetching phone numbers:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNumbers()
  }, [])

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/phone-numbers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh the numbers list
      fetchNumbers()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

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
        entry.number.toLowerCase().includes(searchQuery.toLowerCase())
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

  if (loading) {
    return <div className="p-4">Loading phone numbers...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

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
                placeholder="Search phone numbers..."
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
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
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
                      <TableCell>{entry.lastCalled}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleStatusChange(entry.id, entry.status === "active" ? "inactive" : "active")}>
                              {entry.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
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
