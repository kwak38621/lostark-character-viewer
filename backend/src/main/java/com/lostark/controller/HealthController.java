package com.lostark.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// 헬스체크 + 슬립 방지(UptimeRobot)용 엔드포인트
@RestController
public class HealthController {

    // 루트와 /health 모두 200 OK 반환 (백엔드 생존 확인)
    @GetMapping({"/", "/health"})
    public String health() {
        return "OK - Lost Ark backend is running";
    }
}
