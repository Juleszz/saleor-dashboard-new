import useForm, { FormChange, SubmitPromise } from "@saleor/hooks/useForm";
import useFormset from "@saleor/hooks/useFormset";
import { OrderDetails_order } from "@saleor/orders/types/OrderDetails";
import handleFormSubmit from "@saleor/utils/handlers/handleFormSubmit";
import React from "react";
import { useState } from "react";

import {
  FormsetQuantityData,
  LineItemData,
  OrderReturnRefundCommonHandlers
} from "../OrderRefundReturnAmount/utils/types";
import {
  getById,
  getHandlersWithTriggerChange,
  getItemsWithMaxedQuantities,
  orderReturnRefundDefaultFormData
} from "../OrderReturnPage/utils";
import { refundFulfilledStatuses } from "../OrderReturnPage/utils/FulfillmentsParser";
import { RefundLineDataParser } from "../OrderReturnPage/utils/RefundLineDataParser";

export enum OrderRefundType {
  MISCELLANEOUS = "miscellaneous",
  PRODUCTS = "products"
}
export enum OrderRefundAmountCalculationMode {
  AUTOMATIC = "automatic",
  MANUAL = "manual"
}

export interface OrderRefundData {
  amount: number | string;
  type: OrderRefundType;
  refundShipmentCosts: boolean;
  amountCalculationMode: OrderRefundAmountCalculationMode;
}

export type OrderRefundHandlers = OrderReturnRefundCommonHandlers;

export interface OrderRefundFormData extends OrderRefundData {
  unfulfilledItemsQuantities: FormsetQuantityData;
  fulfilledItemsQuantities: FormsetQuantityData;
}

export interface UseOrderRefundFormResult {
  change: FormChange;
  data: OrderRefundFormData;
  disabled: boolean;
  handlers: OrderRefundHandlers;
  hasChanged: boolean;
  submit: () => Promise<boolean>;
}

interface OrderRefundFormProps {
  children: (props: UseOrderRefundFormResult) => React.ReactNode;
  order: OrderDetails_order;
  defaultType: OrderRefundType;
  onSubmit: (data: OrderRefundFormData) => SubmitPromise;
}

const getOrderRefundPageFormData = (
  defaultType: OrderRefundType
): OrderRefundData => ({
  ...orderReturnRefundDefaultFormData,
  type: defaultType
});

function useOrderRefundForm(
  order: OrderDetails_order,
  defaultType: OrderRefundType,
  onSubmit: (data: OrderRefundFormData) => SubmitPromise
): UseOrderRefundFormResult {
  const [hasChanged, setHasChanged] = useState(false);
  const parser = new RefundLineDataParser(order, refundFulfilledStatuses);
  const form = useForm(getOrderRefundPageFormData(defaultType));

  const triggerChange = () => setHasChanged(true);

  const handleChange: FormChange = (event, cb) => {
    form.change(event, cb);
    triggerChange();
  };

  const unfulfilledItemsQuantities = useFormset<LineItemData, number>(
    parser.getUnfulfilledParsedLineData({ initialValue: 0 })
  );

  const fulfilledItemsQuantities = useFormset<LineItemData, number>(
    parser.getFulfilledParsedLineData({ initialValue: 0 })
  );

  const setMaximalUnfulfilledItemsQuantities = () =>
    unfulfilledItemsQuantities.set(
      getItemsWithMaxedQuantities(unfulfilledItemsQuantities, order.lines)
    );

  const setMaximalFulfilledItemsQuantities = (fulfillmentId: string) =>
    fulfilledItemsQuantities.set(
      getItemsWithMaxedQuantities(
        fulfilledItemsQuantities,
        order.fulfillments.find(getById(fulfillmentId))?.lines
      )
    );

  const data: OrderRefundFormData = {
    ...form.data,
    fulfilledItemsQuantities: fulfilledItemsQuantities.data,
    unfulfilledItemsQuantities: unfulfilledItemsQuantities.data
  };

  const submit = () => handleFormSubmit(data, onSubmit, setHasChanged);

  const handlers = {
    changeFulfilledItemsQuantity: fulfilledItemsQuantities.change,
    changeUnfulfilledItemsQuantity: unfulfilledItemsQuantities.change,
    setMaximalFulfilledItemsQuantities,
    setMaximalUnfulfilledItemsQuantities
  };

  return {
    change: handleChange,
    data,
    disabled: !order,
    handlers: getHandlersWithTriggerChange<OrderRefundHandlers>(
      handlers,
      triggerChange
    ),
    hasChanged,
    submit
  };
}

const OrderRefundForm: React.FC<OrderRefundFormProps> = ({
  children,
  order,
  defaultType,
  onSubmit
}) => {
  const props = useOrderRefundForm(order, defaultType, onSubmit);

  return <form onSubmit={props.submit}>{children(props)}</form>;
};

OrderRefundForm.displayName = "OrderRefundForm";
export default OrderRefundForm;
