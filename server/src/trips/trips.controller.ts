import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto, SaveTripDto } from './trip.dto';
import { Trip } from './trip.entity';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  createTrip(@Body() dto: CreateTripDto): Promise<Trip> {
    return this.tripsService.createTrip(dto);
  }

  @Get(':id')
  getTrip(@Param('id') id: string): Promise<Trip> {
    return this.tripsService.getTrip(id);
  }

  @Put(':id')
  saveTrip(@Param('id') id: string, @Body() dto: Omit<SaveTripDto, 'id'>): Promise<Trip> {
    return this.tripsService.saveTrip({ id, ...dto });
  }
}
