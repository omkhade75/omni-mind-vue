import { createServerFn } from "@tanstack/react-start";
import { getTenantPrisma } from "./server/prisma";
import { requireAuth } from "./server-auth";

export interface StaffListItem {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  designation: string;
  salary: number;
  shift: string;
  joiningDate: string;
  status: string;
}

export const getStaffServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async () => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const staff = await prisma.staff.findMany({
      orderBy: { employeeCode: "asc" },
    });

    return staff.map((s) => ({
      id: s.id,
      employeeCode: s.employeeCode,
      name: s.name,
      email: s.email,
      phone: s.phone,
      departmentId: s.departmentId,
      designation: s.designation,
      salary: Number(s.salary),
      shift: s.shift,
      joiningDate: s.joiningDate.toISOString().split("T")[0],
      status: s.status,
    })) as StaffListItem[];
  });

export const addStaffServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      email: string;
      phone: string;
      departmentId: string;
      designation: string;
      salary: number;
      shift: string;
      joiningDate: string;
      role: string;
      emailUser: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    return // @ts-ignore
 await prisma.staff.create({
      data: {
              employeeCode: `EMP-${Math.floor(10000 + Math.random() * 90000)}`,
              name: data.name,
              email: data.email,
              phone: data.phone,
              departmentId: data.departmentId,
              designation: data.designation,
              salary: data.salary,
              shift: data.shift,
              joiningDate: new Date(data.joiningDate),
              status: "Active",
            } as any,
    });
  });

export const editStaffServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      name: string;
      email: string;
      phone: string;
      departmentId: string;
      designation: string;
      salary: number;
      shift: string;
      joiningDate: string;
      status: string;
      role: string;
      emailUser: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    return // @ts-ignore
 await prisma.staff.update({
      where: { id: data.id } as any,
      data: {
              name: data.name,
              email: data.email,
              phone: data.phone,
              departmentId: data.departmentId,
              designation: data.designation,
              salary: data.salary,
              shift: data.shift,
              joiningDate: new Date(data.joiningDate),
              status: data.status,
            } as any,
    });
  });

export const archiveStaffServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    return // @ts-ignore
 await prisma.staff.update({
      where: { id: data.id } as any,
      data: { status: "Inactive" } as any,
    });
  });
