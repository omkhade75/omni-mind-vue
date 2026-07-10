import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

export interface DeliveryItem {
  id: string;
  orderNumber: string;
  customerName: string;
  destination: string;
  driverName: string;
  vehicleNumber: string;
  itemsCount: number;
  status: string;
  delayReason?: string | null;
  dispatchedAt: string;
  deliveredAt?: string | null;
}

const MOCK_DISPATCHES = [
  {
    orderNumber: "TXN-10029",
    customerName: "Sneha Bhosale",
    destination: "Koregaon Park, Pune",
    driverName: "Vijay Yadav",
    vehicleNumber: "MH-12-PQ-8841",
    itemsCount: 5,
    status: "In Transit",
    delayReason: null,
  },
  {
    orderNumber: "TXN-10034",
    customerName: "Aditi Joshi",
    destination: "Kothrud, Pune",
    driverName: "Sanjay Mane",
    vehicleNumber: "MH-12-RS-9921",
    itemsCount: 3,
    status: "Delayed",
    delayReason: "Heavy road construction at Kothrud bypass",
  },
  {
    orderNumber: "TXN-10038",
    customerName: "Rohan Kulkarni",
    destination: "Aundh, Pune",
    driverName: "Dinesh Kadam",
    vehicleNumber: "MH-12-XY-4040",
    itemsCount: 2,
    status: "Out for Delivery",
    delayReason: null,
  },
  {
    orderNumber: "TXN-10041",
    customerName: "Meera Rane",
    destination: "Viman Nagar, Pune",
    driverName: "Vijay Yadav",
    vehicleNumber: "MH-12-PQ-8841",
    itemsCount: 8,
    status: "Delivered",
    delayReason: null,
  },
];

export const getLogisticsDispatchesServer = createServerFn({ method: "POST" })
  .validator((data: {}) => data)
  .handler(async () => {
    let dispatches = await prisma.deliveryDispatch.findMany({
      orderBy: { dispatchedAt: "desc" },
    });



    return dispatches.map((d) => ({
      id: d.id,
      orderNumber: d.orderNumber,
      customerName: d.customerName,
      destination: d.destination,
      driverName: d.driverName,
      vehicleNumber: d.vehicleNumber,
      itemsCount: d.itemsCount,
      status: d.status,
      delayReason: d.delayReason,
      dispatchedAt: d.dispatchedAt.toISOString(),
      deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
    })) as DeliveryItem[];
  });

export const createLogisticsDispatchServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      orderNumber: string;
      customerName: string;
      destination: string;
      driverName: string;
      vehicleNumber: string;
      itemsCount: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const result = await prisma.deliveryDispatch.create({
      data: {
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        destination: data.destination,
        driverName: data.driverName,
        vehicleNumber: data.vehicleNumber,
        itemsCount: data.itemsCount,
        status: "Dispatched",
      },
    });

    // Write a business event for tracking
    await prisma.businessEvent.create({
      data: {
        eventType: "DELIVERY_DISPATCHED",
        entityType: "DeliveryDispatch",
        entityId: result.id,
        title: `Delivery Dispatched: ${data.orderNumber}`,
        description: `Order dispatched to ${data.customerName} via driver ${data.driverName} (${data.vehicleNumber}).`,
        metadata: JSON.stringify({ driver: data.driverName, destination: data.destination }),
      },
    });

    return result;
  });

export const updateLogisticsStatusServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      dispatchId: string;
      status: string;
      delayReason?: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    const deliveredDate = data.status === "Delivered" ? new Date() : null;

    const result = await prisma.deliveryDispatch.update({
      where: { id: data.dispatchId },
      data: {
        status: data.status,
        delayReason: data.delayReason || null,
        deliveredAt: deliveredDate,
      },
    });

    // Write business event if delivered
    if (data.status === "Delivered") {
      await prisma.businessEvent.create({
        data: {
          eventType: "DELIVERY_COMPLETED",
          entityType: "DeliveryDispatch",
          entityId: result.id,
          title: `Delivery Completed: ${result.orderNumber}`,
          description: `Order successfully delivered to ${result.customerName} at ${result.destination}.`,
        },
      });
    }

    return result;
  });
