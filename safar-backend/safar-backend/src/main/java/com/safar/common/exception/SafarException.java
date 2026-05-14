package com.safar.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class SafarException extends RuntimeException {
    private final String code;
    private final HttpStatus status;
    
    public SafarException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }
    
    public static SafarException badRequest(String code, String message) {
        return new SafarException(code, message, HttpStatus.BAD_REQUEST);
    }
    
    public static SafarException notFound(String code, String message) {
        return new SafarException(code, message, HttpStatus.NOT_FOUND);
    }
    
    public static SafarException unauthorized(String message) {
        return new SafarException("UNAUTHORIZED", message, HttpStatus.UNAUTHORIZED);
    }
    
    public static SafarException forbidden(String message) {
        return new SafarException("FORBIDDEN", message, HttpStatus.FORBIDDEN);
    }
    
    public static SafarException internal(String message) {
        return new SafarException("INTERNAL_ERROR", message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
