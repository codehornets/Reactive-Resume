import { Body, Controller, Delete, Get, Patch, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UpdateUserDto, UserDto } from "@reactive-resume/dto";
import type { Response } from "express";

import { AuthService } from "../auth/auth.service";
import { TwoFactorGuard } from "../auth/guards/two-factor.guard";
import { User } from "./decorators/user.decorator";
import { UserService } from "./user.service";

@ApiTags("User")
@Controller("user")
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Get("me")
  @UseGuards(TwoFactorGuard)
  fetch(@User() user: UserDto) {
    return user;
  }

  @Patch("me")
  @UseGuards(TwoFactorGuard)
  async update(@User("email") email: string, @Body() updateUserDto: UpdateUserDto) {
    // If user is updating their email, send a verification email
    if (updateUserDto.email && updateUserDto.email !== email) {
      await this.userService.updateByEmail(email, {
        emailVerified: false,
        email: updateUserDto.email,
      });

      await this.authService.sendVerificationEmail(updateUserDto.email);

      email = updateUserDto.email;
    }

    return this.userService.updateByEmail(email, {
      name: updateUserDto.name,
      picture: updateUserDto.picture,
      username: updateUserDto.username,
      language: updateUserDto.language,
    });
  }

  @Delete("me")
  @UseGuards(TwoFactorGuard)
  async delete(@User("id") id: string, @Res({ passthrough: true }) response: Response) {
    await this.userService.deleteOneById(id);

    response.clearCookie("Authentication");
    response.clearCookie("Refresh");

    response.status(200).send({ message: "Sorry to see you go, goodbye!" });
  }
}
