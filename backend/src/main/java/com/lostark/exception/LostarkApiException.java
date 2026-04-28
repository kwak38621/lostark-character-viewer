package com.lostark.exception;

public class LostarkApiException extends RuntimeException {
    public LostarkApiException(String message) {
        super(message);
    }

    public LostarkApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
