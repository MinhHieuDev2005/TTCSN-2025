package com.example.creatshop.job.state;

import com.example.creatshop.constant.OrderStatus;


public class ShippedState extends OrderState {

    @Override
    public void next(OrderContext context) {
        context.setState(new DeliveredState());
    }

    @Override
    public void prev(OrderContext context) {
        context.setState(new ProcessingState());
    }

    @Override
    public OrderStatus getStatus() {
        return OrderStatus.Shipped;
    }
}