package com.example.creatshop.job.state;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.OrderStatus;
import com.example.creatshop.exception.BadRequestException;
import lombok.extern.log4j.Log4j2;

/**
 * ----------------------------------------------------------------------------
 * Author:        Hong Anh
 * Created on:    14/12/2024 at 11:20 PM
 * Project:       CreaTShop-server
 * Contact:       https://github.com/lehonganh0201
 * ----------------------------------------------------------------------------
 */

@Log4j2
public class ProcessingState extends OrderState {

    @Override
    public void next(OrderContext context) {
        context.setState(new ShippedState());
    }

    @Override
    public void prev(OrderContext context) {
        throw new BadRequestException(ErrorMessage.OrderDetail.ERR_ORDER_STATUS_FIRST);
    }

    @Override
    public OrderStatus getStatus() {
        return OrderStatus.Processing;
    }
}