package com.example.creatshop.job.state;

import com.example.creatshop.constant.OrderStatus;
import com.example.creatshop.exception.BadRequestException;

public class CanceledState extends OrderState {
    @Override
    public void next(OrderContext context) {
        throw new BadRequestException("exception.order.canceled-terminal");
    }

    @Override
    public void prev(OrderContext context) {
        throw new BadRequestException("exception.order.canceled-terminal");
    }

    @Override
    public OrderStatus getStatus() {
        return OrderStatus.Canceled;
    }
}
