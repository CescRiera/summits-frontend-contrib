// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMInteractionType_Internal.h>

@class MBMFeaturesetDescriptor;
@protocol MBMInteractionHandler;

NS_SWIFT_NAME(Interaction)
__attribute__((visibility ("default")))
@interface MBMInteraction : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithFeatureset:(nullable MBMFeaturesetDescriptor *)featureset
                                    filter:(nullable id)filter
                                      type:(MBMInteractionType)type
                                   handler:(nonnull id<MBMInteractionHandler>)handler;

@property (nonatomic, readonly, nullable) MBMFeaturesetDescriptor *featureset;
/** A filter allows to specify which features from the featureset should handle the interaction. */
@property (nonatomic, readonly, nullable, copy) id filter;

@property (nonatomic, readonly) MBMInteractionType type;
@property (nonatomic, readonly, nonnull) id<MBMInteractionHandler> handler;

@end
