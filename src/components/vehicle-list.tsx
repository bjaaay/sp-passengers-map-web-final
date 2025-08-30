
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import type { Vehicle } from "@/lib/types"
import { format } from "date-fns"
import { ImageViewDialog } from "./image-view-dialog"

export function VehicleList() {
  const [data, setData] = React.useState<Vehicle[]>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedImage, setSelectedImage] = React.useState<{src: string, title: string} | null>(null)

  React.useEffect(() => {
    const vehiclesRef = ref(database, 'vehicles/');
    const unsubscribe = onValue(vehiclesRef, (snapshot) => {
      const vehiclesData = snapshot.val();
      if (vehiclesData) {
        const vehiclesList = Object.keys(vehiclesData).map(key => ({
          ...vehiclesData[key],
        }));
        setData(vehiclesList);
      } else {
        setData([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: "plateNumber",
      header: "Plate Number",
      cell: ({ row }) => <div>{row.getValue("plateNumber")}</div>,
    },
    {
      accessorKey: "vehicleType",
      header: "Vehicle Type",
      cell: ({ row }) => <div>{row.getValue("vehicleType")}</div>,
    },
    {
      accessorKey: "gpsTrackerId",
      header: "GPS Tracker ID",
      cell: ({ row }) => <div>{row.getValue("gpsTrackerId")}</div>,
    },
    {
      accessorKey: "registrationDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Registration Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("registrationDate"))
        return <div className="text-left font-medium">{format(date, "PPP")}</div>
      },
    },
    {
      id: "actions",
      header: "Documents",
      cell: ({ row }) => {
        const vehicle = row.original
  
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedImage({src: vehicle.corUrl, title: `COR for ${vehicle.plateNumber}`})}>
              <Eye className="mr-2 h-4 w-4" /> COR
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedImage({src: vehicle.orUrl, title: `OR for ${vehicle.plateNumber}`})}>
              <Eye className="mr-2 h-4 w-4" /> OR
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by plate number..."
          value={(table.getColumn("plateNumber")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("plateNumber")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
       {selectedImage && (
        <ImageViewDialog
          isOpen={!!selectedImage}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedImage(null);
            }
          }}
          imageUrl={selectedImage.src}
          title={selectedImage.title}
        />
      )}
    </div>
  )
}
